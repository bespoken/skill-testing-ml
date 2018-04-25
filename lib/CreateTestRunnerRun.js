const fs = require('fs');
const { pass, fail } = require('create-jest-runner');

module.exports = ({ testPath, config, globalConfig }) => {
    const start = +new Date();
    const contents = fs.readFileSync(testPath, 'utf8');
    const end = +new Date();

    const dummy = require("./DummyTest");
    new dummy().y();
    if (contents.includes('⚔️🏃')) {
        return pass({ start, end, test: { path: testPath } });
    }
    const errorMessage = 'Company policies require ⚔️ 🏃 in every file';
    return fail({
        start,
        end,
        test: { path: testPath, errorMessage, title: 'Check for ⚔️ 🏃' },
    });
};