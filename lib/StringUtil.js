module.exports = class StringUtil {
    static clean(s) {
        if (!s || typeof s !== "string") {
            return s;
        }

        if (s === "undefined") {
            s = undefined;
        } else if (s.startsWith("\"")
            && s.endsWith("\"")) {
            s = s.substr(1, s.length-2);
        }
        return s;
    }
}