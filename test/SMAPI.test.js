const SMAPI = require("../lib/util/SMAPI");

describe("test suite", () => {
    jest.setTimeout(30000);
    beforeEach(() => {
        
    });

    test("simulate", async () => {
        const token = "Atza|IwEBIKLDfWLTU_UeH4yu08t5OHnR0rJMsltVY1ySjwgLRS-GTNc7j-1Z50EacSe5W8TWjTmol7PgibVVSANNBHBUustMe6Kxkjia2yRWx6ikMEPiZdBZOa4HPX_uvUslHefnuPO7IuHDNHzKrSrT0gAoS3AwSdYxOHN7w8O-RLmk85vsCGDW-b1d2IyW8ZQBnVT82Fp1PNbRcmUTiypTUChOO7IM36TEJmKTlfpjeEWK6uhitKVAHnGvUhxQx_2w_E20gDRfNvmas-CNGw208GLfJ5jccs6mFPFBCORTwnjMtaWZBAYT2rkwfOhQ-oLUetovYJ7Ch8Xu6NvhD_kvti0gnZoVAQF8cXepwuJBoPxTOCgyNB8c74623FdYXU3ToTB0fvfch70--pGErFhn7j_bSA1QfJURgugorlj2ntgXEYTdLJetgftuZOum0bBiBTNgGvqJasu92l0G-NujSRKQyWNSUhqs5YlNJr2x5PS7mqH63M9GoLQ7wF53RjKQg9_3EfxrUf411XSzFtBuvj7VPvUo8B4ftMMGfPAtroVrZUHMp2Te69kVikho29Hu4HfYkdWF_cYSkmyrlu4mrLtdvyMNV7m1R1f2WwIxbbme43227CLPnXgaCeJQdSYIMjhGGxIfqDhoqeNfXnuZ99RjI1nV"
        const skillID = "amzn1.ask.skill.2d19cb76-c064-4cf3-8eed-bad3bc9444e5"
        const smapi = new SMAPI(token, skillID, "en-US");
        let result = await smapi.simulate("launch guess the gif", true);
        expect(result.status).toBe("SUCCESSFUL");
        expect(result.result.skillExecutionInfo.invocationResponse.body.response.outputSpeech.type).toBe("SSML");
        //result = await smapi.simulate("rabbit");
    });
});