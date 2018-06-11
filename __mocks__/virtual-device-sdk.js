const mockMessage = jest.fn(()=>{
  return {};  
});

const spaceFactMessage = jest.fn((utterance)=> {
    const response = {
        card:{
            textField: "textField",
            imageURL: "imageURL",
            mainTitle: "mainTitle"
        } 
    };
    if (utterance.toLowerCase().includes("help")) response.transcript = "you can say";
    else response.transcript = "Here's your fact";
    return response;  
});

const mockVirtualDevice = jest.fn().mockImplementation((token) => {
    if(token === "space fact") return {message: spaceFactMessage};
    return { message: mockMessage };
});

exports.mockMessage = mockMessage;
exports.mockVirtualDevice = mockVirtualDevice;
exports.VirtualDevice = mockVirtualDevice;