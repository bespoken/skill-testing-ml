class TestedClass {
    y() {
        if (true) {
            return 2;
        }
        return 1;
    }
}

module.exports = TestedClass;


new TestedClass().y();