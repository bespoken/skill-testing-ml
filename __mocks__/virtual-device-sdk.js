const mockMessage = jest.fn((arg)=>{
  if (arg && arg.length > 0 && arg[0].text === "exception") throw Error("mock exception");
  return [{}];
});

const mockAddHomophones = jest.fn();
const mockWaitForSessionToEnd = jest.fn();

const spaceFactMessage = jest.fn((messages)=> {
    const responses = [];
    for (const message of messages) {
        responses.push(handleMessage(message));
    }
    return responses;
});

const mockVirtualDevice = jest.fn().mockImplementation((token) => {
    if(token === "space fact") return {batchMessage: spaceFactMessage};
    return {
        addHomophones: mockAddHomophones,
        batchMessage: mockMessage,
        waitForSessionToEnd: mockWaitForSessionToEnd
    };
});

function handleMessage(message) {
    const utterance = message.text;
    const response = {
        card:{
            imageURL: "imageURL",
            mainTitle: "mainTitle",
            textField: "textField",
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
            ]
        }
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
    }
    return response;
}

exports.spaceFactMessage = spaceFactMessage;
exports.mockMessage = mockMessage;
exports.mockAddHomophones = mockAddHomophones;
exports.mockVirtualDevice = mockVirtualDevice;
exports.VirtualDevice = mockVirtualDevice;