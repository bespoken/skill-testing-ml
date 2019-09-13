const mockMessage = jest.fn((arg)=>{
  if (arg && arg.length > 0 && arg[0].text === "exception") throw Error("mock exception");
  return [{}];
});

const mockAddHomophones = jest.fn();
const mockWaitForSessionToEnd = jest.fn();

const getResponsesFromMessages = (messages) => {
    const responses = [];
    for (const message of messages) {
        responses.push(handleMessage(message));
    }
    return responses;
};

const spaceFactMessage = jest.fn((messages)=> {
    return getResponsesFromMessages(messages);
});

const mockGetConversationResults = jest.fn()
    .mockReturnValue({
        results: getResponsesFromMessages([
            {phrases: [], text: "Hi" },
            {phrases: [ ".*Here's your fact*" ], text: "LaunchRequest" } 
        ]),
        status: "COMPLETED"
    });

const mockVirtualDevice = jest.fn().mockImplementation((arg0) => {
    let token = undefined;
    if (arg0 === Object(arg0)) {
        token = arg0.token;
    } else {
        token = arg0;
    }

    if(token === "space fact") return {batchMessage: spaceFactMessage};
    if(token === "async token") return {
        batchMessage: jest.fn(() => {
            return {
                conversation_id: "dummy-id",
            };
        }),
        getConversationResults: mockGetConversationResults,
    };
    if(token === "async token throws") return {
        batchMessage: jest.fn(() => {
            throw new Error("Network Error");
        }),
        getConversationResults: mockGetConversationResults,
    };
    return {
        addHomophones: mockAddHomophones,
        batchMessage: mockMessage,
        waitForSessionToEnd: mockWaitForSessionToEnd,
    };
});

function handleMessage(message) {
    const utterance = message.text;
    const response = {
        card:{
            imageURL: "imageURL",
            mainTitle: "mainTitle",
            textField: "textField",
            type: "randomType"
        },
        display: {
            description: "display description",
            anotherKey: {
                subKey: "20"
            },
            array: [
                {
                    url: "this is a url"
                }, {
                    url: "this is a url 2"
                }
            ]
        },
        raw: {
            key: "some value",
            array: [
                {
                    url: "this is a url"
                }, {
                    url: "this is a url 2"
                }
            ],
            messageBody:{
                directives: [
                    {
                        namespace: "AudioPlayer",
                        payload: {
                            audioItem: {
                                stream: {
                                    url: "https://cdn.kwimer.com/sleep-sounds/thunderstorm.aac",
                                }
                            }
                        }
                    },
                    {
                        namespace: "AudioPlayer",
                        payload: {
                            audioItem: {
                                stream: {
                                    url: "https://cdn.kwimer.com/sleep-sounds/thunderstorm.aac",
                                }
                            }
                        }
                    }
                ]
            }
        },
        streamURL: "https://cdn.kwimer.com/sleep-sounds/thunderstorm.aac",
        shouldEndSession: false
    };
    if (utterance.toLowerCase().includes("help")) {
        response.transcript = "you can say";
    } else if (utterance.toLowerCase().includes("send error")) {
        response.error = {
            source: "error source",
            message: "error message",
            rawMessage: "error rawMessage"
        };
    } else if (utterance.toLowerCase().includes("throw error complex")){
        const error = JSON.stringify({
            results: [{
                error: {
                    source: "error source",
                    message: "error message",
                    rawMessage: "error rawMessage"
                }
            }],
            error: "Error from virtual device on root"
        });
        throw error;
    } else if (utterance.toLowerCase().includes("throw error")) {
        const error = JSON.stringify({
            error: "Error from virtual device"
        });
        throw error;
    } else {
        response.transcript = "Here's your fact";
        response.shouldEndSession =  true;
    }
    return response;
}

exports.spaceFactMessage = spaceFactMessage;
exports.mockMessage = mockMessage;
exports.mockAddHomophones = mockAddHomophones;
exports.mockGetConversationResults = mockGetConversationResults;
exports.mockVirtualDevice = mockVirtualDevice;
exports.VirtualDevice = mockVirtualDevice;