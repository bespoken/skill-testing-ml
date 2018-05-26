# Common Use-Cases And How To Handle Them
* [Testing State With Dynamo](#testing-with-dynamo)
* [Testing The Address API](#testing-with-the-address-api)
* [Testing Dialog-Based Skills](#testing-with-the-dialog-interface)

## Testing With Dynamo
Dynamo can be tricky to test with locally, because there is lots of setup to be done to work with Dynamo locally on your laptop.

To bypass this, simple enable our mock dynamo in your testing configuration:
```
configuration:
  dynamo: mock
  userId: MyUserID
```

With this enabled, a local in-memory version of Dynamo will be used instead.

You can also specifiy values for `userId` and `deviceId` in the configuration.
In this way, different user scenarios can be worked on.

The mock Dynamo DB will maintain it's state for the execution of the entire test suite (a single file).
It will be **reset** between test file executions, so it will be wiped cleanString when a new test file begins running.

In that way, the state can be modified from test to test and checked.

More information on [how it works here](https://github.com/bespoken/virtual-alexa/blob/master/docs/Externals.md#dynamodb).

## Testing With The Address API
The Address API can also be mocked, and specified to reply with a specific value.

To set the address to be returned from the Address API via mock, just enter a configuration like so:
```
configuration:
  address:
    streetAddress1: 1600 Pennsylvania Avenue, NW
    city: Washington
    countryCode: US
    postalCode: 20816
    stateOrRegion: DC
```

That will return a full address when the Alexa Address API is called.

To emulate just the countryOrPostalCode permission, enter an address with just those values:
```
configuration:
  address:
    countryCode: US
    postalCode: 20816
```

If no address information is provided, the Address API will return a 403 - which indicates no permission was received from the user.

## Testing With The Dialog Interface
Tests can be written that use the Dialog Interface, and Dialog Delegate in particular, in the same way as normal tests.

The only difference - the response from the Dialog Manager internal to Virtual Alexa comes as `prompt`, like so:
```
"Open A Dialog":
  - prompt: "Dialog is opened"
```

Easy, right?