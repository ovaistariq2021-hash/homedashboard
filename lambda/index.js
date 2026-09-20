const Alexa = require('ask-sdk-core');
const fs = require('fs');
const path = require('path');
const { buildDashboard } = require('./dashboard');

const dashboardDocument = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'apl', 'dashboard.json'), 'utf8')
);

function supportsAPL(handlerInput) {
    const interfaces = Alexa.getSupportedInterfaces(handlerInput.requestEnvelope);
    return !!(interfaces && interfaces['Alexa.Presentation.APL']);
}

function addDashboardDirective(handlerInput, datasource) {
    if (supportsAPL(handlerInput)) {
        handlerInput.responseBuilder.addDirective({
            type: 'Alexa.Presentation.APL.RenderDocument',
            token: 'homeDashboardToken',
            document: dashboardDocument,
            datasources: datasource
        });
    }
}

function formatMeta(clock) {
    return `  ${clock.label}  •  ${clock.date}`;
}

function addDashboardUpdateCommands(handlerInput, datasource, nextPollMs) {
    if (!supportsAPL(handlerInput)) return;
    const d = datasource.dashboard;
    handlerInput.responseBuilder.addDirective({
        type: 'Alexa.Presentation.APL.ExecuteCommands',
        token: 'homeDashboardToken',
        commands: [
            { type: 'SetValue', componentId: 'time0', property: 'text', value: d.clocks[0].time },
            { type: 'SetValue', componentId: 'meta0', property: 'text', value: formatMeta(d.clocks[0]) },
            { type: 'SetValue', componentId: 'time1', property: 'text', value: d.clocks[1].time },
            { type: 'SetValue', componentId: 'meta1', property: 'text', value: formatMeta(d.clocks[1]) },
            { type: 'SetValue', componentId: 'weatherIcon', property: 'text', value: d.weather.icon },
            { type: 'SetValue', componentId: 'weatherTemp', property: 'text', value: d.weather.temperature },
            { type: 'SetValue', componentId: 'weatherCondition', property: 'text', value: d.weather.condition },
            { type: 'SetValue', componentId: 'weatherLocation', property: 'text', value: d.weather.location },
            { type: 'SendEvent', arguments: ['refresh'], delay: nextPollMs }
        ]
    });
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
        try {
            const { datasource } = await buildDashboard();
            handlerInput.attributesManager.setSessionAttributes({ lastDatasource: datasource });
            addDashboardDirective(handlerInput, datasource);
            return handlerInput.responseBuilder
                .withShouldEndSession(false)
                .getResponse();
        } catch (err) {
            console.log(`~~~~ Launch error: ${err.stack}`);
            return handlerInput.responseBuilder
                .speak("I couldn't load the dashboard right now. Please try again shortly.")
                .withShouldEndSession(true)
                .getResponse();
        }
    }
};

const DashboardRefreshEventHandler = {
    canHandle(handlerInput) {
        const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
        if (requestType !== 'Alexa.Presentation.APL.UserEvent') return false;
        const args = handlerInput.requestEnvelope.request.arguments || [];
        return args[0] === 'refresh';
    },
    async handle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        try {
            console.log('Dashboard tick...');
            const { datasource } = await buildDashboard();
            const previous = attributesManager.getSessionAttributes().lastDatasource;
            attributesManager.setSessionAttributes({ lastDatasource: datasource });

            const backgroundChanged = !previous
                || previous.dashboard.backgroundVideo !== datasource.dashboard.backgroundVideo;

            if (backgroundChanged) {
                // Background rotated to a new clip — full re-render restarts the Video component with the new source.
                addDashboardDirective(handlerInput, datasource);
            } else {
                // Same clip still playing — update text in place so the looping video is never interrupted.
                addDashboardUpdateCommands(handlerInput, datasource, datasource.dashboard.nextPollMs);
            }
        } catch (err) {
            console.log(`~~~~ Refresh error: ${err.stack}`);
            // Keep the loop alive on a transient error: reschedule without disturbing the video or displayed text.
            const cached = attributesManager.getSessionAttributes().lastDatasource;
            const nextPollMs = cached ? cached.dashboard.nextPollMs : 15 * 1000;
            if (supportsAPL(handlerInput)) {
                handlerInput.responseBuilder.addDirective({
                    type: 'Alexa.Presentation.APL.ExecuteCommands',
                    token: 'homeDashboardToken',
                    commands: [{ type: 'SendEvent', arguments: ['refresh'], delay: nextPollMs }]
                });
            }
        }
        return handlerInput.responseBuilder
            .withShouldEndSession(false)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = "This is your home dashboard. Say 'Alexa, stop' anytime to close it.";
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        if (supportsAPL(handlerInput)) {
            handlerInput.responseBuilder.addDirective({ type: 'Alexa.Presentation.APL.ClearDocument' });
        }
        return handlerInput.responseBuilder
            .withShouldEndSession(true)
            .getResponse();
    }
};

const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = "Say 'Alexa, stop' to close the dashboard.";
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder.getResponse();
    }
};

const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const skillBuilder = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        DashboardRefreshEventHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler,
    )
    .addErrorHandlers(
        ErrorHandler,
    );

exports.skillBuilder = skillBuilder;
exports.handler = skillBuilder.lambda();
