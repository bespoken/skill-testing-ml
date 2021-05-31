module.exports = {
    onResponse: (test, response) => {
        response.filter1 = "assigned on filter 1";
    },
    onValue: (assertion) => {
        if (assertion.path === "customPath") {
            return "assigned on filter 1 onValue";
        }
        return undefined;
    },
};