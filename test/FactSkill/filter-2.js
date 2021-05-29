module.exports = {
    onResponse: (test, response) => {
        response.filter2 = "assigned on filter 2";
    },
    onValue: (assertion) => {
        if (assertion.path === "customPath") {
            return "assigned on filter 2 onValue";
        }
        return undefined;
    },
};