const mockMessage = jest.fn((arg)=>{
  if (arg && arg.length > 0 && arg[0].text === "exception") throw Error("mock exception");
  return {
      status: "COMPLETED",
      results: [{}]
  };
});

const mockAddFilter = jest.fn();
const mockAddHomophones = jest.fn();
const mockWaitForSessionToEnd = jest.fn();
const mockBatchMessageAsyncMode = jest.fn(() => {
    return {
        conversation_id: "dummy-id",
    };
});

const getResponsesFromMessages = (messages) => {
    const responses = [];
    for (const message of messages) {
        responses.push(handleMessage(message));
    }
    return responses;
};

const spaceFactMessage = jest.fn((messages)=> {
    return {
        results: getResponsesFromMessages(messages),
        status: "COMPLETED"
    };
});

const mockGetConversationResults = jest.fn()
    .mockReturnValue({
        results: getResponsesFromMessages([
            {phrases: [], text: "Hi" },
            {phrases: [ ".*Here's your fact*" ], text: "LaunchRequest" } 
        ]),
        status: "COMPLETED"
    });

const mockGetConversationResultsWithError = jest.fn()
    .mockRejectedValue({
        error: "Call was not answered",
        status: "COMPLETED",
        error_code: 554
    });

const mockVirtualDevice = jest.fn().mockImplementation((arg0) => {
    let token = undefined;
    if (arg0 === Object(arg0)) {
        token = arg0.token;
    } else {
        token = arg0;
    }

    if(token === "space fact") return {
        addFilter: mockAddFilter,
        batchMessage: spaceFactMessage,
        clearFilters: jest.fn(),
    };
    if(token === "async token") return {
        addFilter: mockAddFilter,
        batchMessage: mockBatchMessageAsyncMode,
        clearFilters: jest.fn(),
        getConversationResults: mockGetConversationResults,
    };
    if(token === "async token throws") return {
        addFilter: mockAddFilter,
        batchMessage: jest.fn(() => ({
            error: "Network Error",
            status: "COMPLETED"
        })),
        clearFilters: jest.fn(),
        getConversationResults: mockGetConversationResults,
    };
    if(token === "async token error on result") return {
        addFilter: mockAddFilter,
        batchMessage: mockBatchMessageAsyncMode,
        clearFilters: jest.fn(),
        getConversationResults: mockGetConversationResultsWithError,
    };
    return {
        addFilter: mockAddFilter,
        addHomophones: mockAddHomophones,
        batchMessage: mockMessage,
        clearFilters: jest.fn(),
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
        shouldEndSession: false,
        utteranceURL: "https://bespoken-virtual-device-generated-audios.s3.amazonaws.com/",
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
            error_category: "system",
            error: "Error from virtual device"
        });
        throw error;
    } else if (utterance.toLowerCase().includes("throw user error")) {
        const error = JSON.stringify({
            error_category: "user",
            error: "Error from virtual device"
        });
        throw error;
    } else if (utterance.toLowerCase().includes("get error on result")) {
        const error = {
            error_category: "system",
            message: "Error from virtual device"
        };
        response.error = error;
    } else {
        response.transcript = "Here's your fact";
        response.shouldEndSession =  true;
    }
    return response;
}

exports.spaceFactMessage = spaceFactMessage;
exports.mockMessage = mockMessage;
exports.mockAddFilter = mockAddFilter;
exports.mockAddHomophones = mockAddHomophones;
exports.mockBatchMessageAsyncMode = mockBatchMessageAsyncMode;
exports.mockGetConversationResults = mockGetConversationResults;
exports.mockGetConversationResultsWithError = mockGetConversationResultsWithError;
exports.mockVirtualDevice = mockVirtualDevice;
exports.VirtualDevice = mockVirtualDevice;