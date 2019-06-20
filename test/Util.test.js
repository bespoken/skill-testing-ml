const Util = require("../lib/util/Util");

describe("succinct intent", () => {
    test("get intent", async () => {

        let intent = Util.returnIntentObjectFromUtteranceIfValid("PetMatchIntent");
        expect(intent.name).toBe("PetMatchIntent");
        expect(intent.slots).toBeUndefined();

        intent = Util.returnIntentObjectFromUtteranceIfValid("PetMatchIntent size=mini");
        expect(intent.name).toBe("PetMatchIntent");
        expect(Object.keys(intent.slots).length).toBe(1);
        expect(intent.slots.size).toEqual("mini");

        intent = Util.returnIntentObjectFromUtteranceIfValid("PetMatchIntent size=mini temperament=guard");
        expect(intent.name).toBe("PetMatchIntent");
        expect(Object.keys(intent.slots).length).toBe(2);
        expect(intent.slots.size).toEqual("mini");
        expect(intent.slots.temperament).toEqual("guard");

        intent = Util.returnIntentObjectFromUtteranceIfValid("PetMatchIntent size=mini temperament=guard energy=low");
        expect(intent.name).toBe("PetMatchIntent");
        expect(Object.keys(intent.slots).length).toBe(3);
        expect(intent.slots.size).toEqual("mini");
        expect(intent.slots.temperament).toEqual("guard");
        expect(intent.slots.energy).toEqual("low");

        intent = Util.returnIntentObjectFromUtteranceIfValid("PetMatchIntent size=\"mini\" temperament=guard");
        expect(intent.name).toBe("PetMatchIntent");
        expect(Object.keys(intent.slots).length).toBe(2);
        expect(intent.slots.size).toEqual("mini");
        expect(intent.slots.temperament).toEqual("guard");

        intent = Util.returnIntentObjectFromUtteranceIfValid("PetMatchIntent size=\"mini mini\" temperament=guard");
        expect(intent.name).toBe("PetMatchIntent");
        expect(Object.keys(intent.slots).length).toBe(2);
        expect(intent.slots.size).toEqual("mini mini");
        expect(intent.slots.temperament).toEqual("guard");

        intent = Util.returnIntentObjectFromUtteranceIfValid("PetMatchIntent size=\"mini mini\" temperament=\"guard guard\"");
        expect(intent.name).toBe("PetMatchIntent");
        expect(Object.keys(intent.slots).length).toBe(2);
        expect(intent.slots.size).toEqual("mini mini");
        expect(intent.slots.temperament).toEqual("guard guard");

        intent = Util.returnIntentObjectFromUtteranceIfValid("PetMatchIntent slot1=1");
        expect(intent.name).toBe("PetMatchIntent");
        expect(Object.keys(intent.slots).length).toBe(1);
        expect(intent.slots.slot1).toEqual("1");

        // eslint-disable-next-line spellcheck/spell-checker
        intent = Util.returnIntentObjectFromUtteranceIfValid("PetMatchIntent slot=\"Prüfung\"");
        expect(intent.name).toBe("PetMatchIntent");
        expect(Object.keys(intent.slots).length).toBe(1);
        // eslint-disable-next-line spellcheck/spell-checker
        expect(intent.slots.slot).toEqual("Prüfung");

        // eslint-disable-next-line spellcheck/spell-checker
        intent = Util.returnIntentObjectFromUtteranceIfValid("PetMatchIntent slot=Prüfung");
        expect(intent.name).toBe("PetMatchIntent");
        expect(Object.keys(intent.slots).length).toBe(1);
        // eslint-disable-next-line spellcheck/spell-checker
        expect(intent.slots.slot).toEqual("Prüfung");

        intent = Util.returnIntentObjectFromUtteranceIfValid("AMAZON.HelpIntent");
        expect(intent.name).toBe("AMAZON.HelpIntent");
        expect(intent.slots).toBeUndefined();

        intent = Util.returnIntentObjectFromUtteranceIfValid("PetMatchIntent-WithDash");
        expect(intent.name).toBe("PetMatchIntent-WithDash");
        expect(intent.slots).toBeUndefined();

    });
});