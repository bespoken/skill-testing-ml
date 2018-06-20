module.exports = {
    onRequest: (test, request) => {
        request.requestFiltered = true;
    },

    onResponse: (test, response) => {
        response.responseFiltered = true;
    }
}