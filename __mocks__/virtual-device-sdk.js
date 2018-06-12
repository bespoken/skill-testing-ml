const mockMessage = jest.fn(()=>{
  return {};  
});

const mockAddHomophones = jest.fn();
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
    return { message: mockMessage, addHomophones: mockAddHomophones };
});

exports.mockMessage = mockMessage;
exports.mockAddHomophones = mockAddHomophones;
exports.mockVirtualDevice = mockVirtualDevice;
exports.VirtualDevice = mockVirtualDevice;