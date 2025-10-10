const { expect } = require("chai");
const sinon = require("sinon");
const winston = require("winston");
const stream = require("stream");
const proxyquire = require("proxyquire").noCallThru();
const { Logtail } = require("@logtail/node");
const { LogtailTransport } = require("@logtail/winston");
const { logger } = require("../../src/controllers/logger.controller");
const config = require("../../src/config");


describe("Logger module", () => {
  let sandbox;
  let winstonStub, LogtailStub, configStub, mockLogtail;

  beforeEach(() => {
    const EventEmitter = require("events");
    EventEmitter.defaultMaxListeners = 100; // increase the limit for the tests
    
    sandbox = sinon.createSandbox();

    // create a mock Logtail instance
    mockLogtail = {
      log: sinon.stub()
    };
    
    winstonStub = {
      createLogger: sinon.stub(),
      transports: {
        File: sinon.stub(),
        Console: sinon.stub(),
        Stream: sinon.stub()
      },
      format: {
        combine: sinon.stub(),
        timestamp: sinon.stub(),
        printf: sinon.stub(),
        colorize: sinon.stub(),
        json: sinon.stub()
      },
      createLogger: sinon.stub().returns({})
    };

    configStub = {
      mode: {
        test: true,
        staging: false,
        production: false,
        development: false
      },
      logs: {
        betterstack: {
          enabled: true,
        },
        file: {
          name: "tmp/test.log",
          maxsize: 5242880,
        },
        levelMap: {
          test: "debug"
        }
      }
    };

    LogtailStub = sinon.stub();
    streamStub = {
      Writable: stream.Writable
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  const loadModuleWithStubs = () => proxyquire("../../src/controllers/logger.controller", {
    winston: winstonStub,
    "../config": configStub,
    "@logtail/node": { Logtail: LogtailStub },
    "@logtail/winston": { LogtailTransport: sinon.stub() },
    stream: streamStub
  });
  
  describe("Logger initialization", () => {
    it("should initialize the logger with the correct transports and exception handlers", () => {
      expect(logger).to.be.an.instanceOf(winston.Logger);
      expect(Object.values(logger.transports).length).to.be.greaterThan(0); // convert container to array
      expect(logger.exceptions.handlers.size).to.be.greaterThan(0); // ensure exception handlers is defined
    });

    it("should have a File transport", () => {
      const transportsArray = Object.values(logger.transports); // Convert Container to array
      const fileTransport = transportsArray.find(
        (transport) => transport instanceof winston.transports.File
      );
      expect(fileTransport).to.exist;
    });

    it("should have a Console transport", () => {
      const transportsArray = Object.values(logger.transports); // Convert Container to array
      const consoleTransport = transportsArray.find(
        (transport) => transport instanceof winston.transports.Console
      );
      expect(consoleTransport).to.exist;
    });

    it("should have a Logtail transport if not in test mode", () => {
      const transportsArray = Object.values(logger.transports); // Convert Container to array
      const logtailTransport = transportsArray.find(
        (transport) => transport instanceof winston.transports.Stream
      );
      if (!config.mode.test) {
        expect(logtailTransport).to.exist;
      } else {
        expect(logtailTransport).to.not.exist;
      }
    });
  });

  // conditionally run LogtailStream tests only if not in test mode
  if (!config.mode.test) {
    describe("LogtailStream Class", () => {
      let logtailStream;
      let logtailStub;

      beforeEach(() => {
        logtailStub = sandbox.createStubInstance(Logtail);
        const transportsArray = Object.values(logger.transports); // Convert Container to array
        const logtailTransport = transportsArray.find(
          (transport) => transport instanceof winston.transports.Stream
        );
        logtailStream = logtailTransport.stream; // Access the stream property
      });

      it("should write logs to Logtail", (done) => {
        const info = {
          level: "info",
          message: "Test message",
          [Symbol.for("splat")]: ["Additional info"],
        };

        logtailStub.log.resolves();
        logtailStream._write(info, "utf8", (err) => {
          expect(err).to.be.undefined;
          expect(logtailStub.log.calledOnce).to.be.true;
          expect(logtailStub.log.calledWithMatch("[INFO] Test message Additional info")).to.be.true;
          done();
        });
      });

      it("should handle errors when writing to Logtail", (done) => {
        const info = {
          level: "error",
          message: "Test error",
          [Symbol.for("splat")]: ["Error details"],
        };

        logtailStub.log.rejects(new Error("Logtail error"));
        logtailStream._write(info, "utf8", (err) => {
          expect(err).to.be.an.instanceOf(Error);
          expect(logtailStub.log.calledOnce).to.be.true;
          done();
        });
      });
    });
  } else {
    // describe.skip("LogtailStream Class", () => {
    //   // these tests will be skipped in test mode
    //   it("should write logs to Logtail (skipped in test mode)", () => {});
    //   it("should handle errors when writing to Logtail (skipped in test mode)", () => {});
    // });
  }

  describe("Logger formatting", () => {
    it("should format logs correctly with additional arguments", () => {
      // mock the colorize formatter to avoid errors
      const colorizeMock = winston.format((info) => {
        return info; // Return the info object as-is, without colorization
      });
  
      // replace the colorize formatter in the logger"s format
      const formatWithArgs = winston.format.combine(
        colorizeMock(), // Use the mock instead of winston.format.colorize()
        winston.format.timestamp(),
        winston.format.printf((info) => {
          const { timestamp, level, message } = info;
          const splatSymbol = Object.getOwnPropertySymbols(info).find(
            (sym) => sym.toString() === "Symbol(splat)"
          );
          const splatArgs = splatSymbol ? info[splatSymbol] : [];
          const extraArgs = splatArgs.length ? splatArgs : undefined;
  
          let logOutput = `${level}: ${timestamp} ${message}`;
          if (extraArgs) {
            extraArgs.forEach((extraArg) => {
              logOutput += ` ${
                typeof extraArg === "string" ? extraArg : JSON.stringify(extraArg)
              }`;
            });
          }
  
          return logOutput;
        })
      );
  
      // apply the format to a log info object
      const info = {
        level: "info",
        message: "Test message",
        timestamp: "2023-10-01T12:00:00Z",
        [Symbol.for("splat")]: ["Additional info"],
      };
  
      const formattedLog = formatWithArgs.transform(info);
  
      // extract the formatted message from the Symbol(message) property
      const messageSymbol = Object.getOwnPropertySymbols(formattedLog).find(
        (sym) => sym.toString() === "Symbol(message)"
      );
      const formattedMessage = formattedLog[messageSymbol];
  
      // assert the formatted message
      expect(formattedMessage).to.equal("info: 2023-10-01T12:00:00Z Test message Additional info");
    });
  });

  describe("Logger exception handling", () => {
    it("should handle exceptions with File transport", () => {
      // convert the Map of handlers to an array
      const handlersArray = Array.from(logger.exceptions.handlers.values());
    
      // find the File transport handler
      const fileExceptionHandler = handlersArray.find(
        (handler) => handler.transport instanceof winston.transports.File
      );
    
      // assert that the File transport handler exists
      expect(fileExceptionHandler).to.exist;
    });

    it("should handle exceptions with Logtail transport if not in test mode", () => {
      // convert the Map of handlers to an array
      const handlersArray = Array.from(logger.exceptions.handlers.values());
          
      // find the File transport handler
      const logtailExceptionHandler = handlersArray.find(
        (handler) => handler.transport instanceof LogtailTransport
      );

      if (!config.mode.test) {
        expect(logtailExceptionHandler).to.exist;
      } else {
        expect(logtailExceptionHandler).to.not.exist;
      }
    });

    /* TODO: TESTINGGGGGGGGGGGGG!!!!
    it("should throw an error when Winston logger creation fails", () => {
      const error = new Error("Winston logger creation error");
      sandbox.stub(winston, "createLogger").throws(error); // stub winston.createLogger to throw an error
    
      expect(() => {
        // use proxyquire to override the winston dependency in the module
        const loggerModule = proxyquire("../../src/controllers/logger.controller", {
          winston: winston, // override winston with the stubbed version
        });
    
        // access the logger to trigger the error
        const { logger } = loggerModule;
      }).to.throw(error); // verify that the error is thrown
    });
    */
    it("should throw an error when Winston logger creation fails", () => {
      const error = new Error("Winston logger creation error");

      const fakeWinston = {
        createLogger: sandbox.stub().throws(error)
      };

      expect(() => {
        proxyquire("../../src/controllers/logger.controller", {
          winston: fakeWinston
        });
      }).to.throw(error);
    });
    
    it("should throw error when winston.createLogger fails", () => {
      // stub winston.createLogger to throw error
      const expectedError = new Error("Failed to create exception handlers");
      winstonStub.createLogger.throws(expectedError);

      // test the module loading itself (the error occurs during require)
      expect(() => {
        // use proxyquire to inject our stubs
        const loggerModule = proxyquire("../../src/controllers/logger.controller", {
          winston: winstonStub,
          "../config": configStub
        });

        // force re-evaluation of the module with our stubs
        proxyquire.reload("../../src/controllers/logger.controller", {
          winston: winstonStub,
          "../config": configStub
        });
      }).to.throw(expectedError);
    });

  });

  describe("Logger exception handlers creation", () => {
    it("should throw error when exception handler creation fails", () => {
      winstonStub.transports.File.throws(new Error("File handler failed"));

      expect(loadModuleWithStubs).to.throw("Winston transports creation error: Error: File handler failed");
    });
  });

  describe("Logger transport creation based on test mode", () => {
    it("should not add BetterStack transport in test mode", () => {
      configStub.mode.test = true; // enable test mode
  
      const { logger } = proxyquire("../../src/controllers/logger.controller", {
        "../config": configStub
      });

      expect(logger).to.be.an.instanceOf(winston.Logger);
      expect(Object.values(logger.transports).length).to.be.greaterThan(0); // convert container to array

      // verify that the transport is not added
      expect(logger.transports.length).to.equal(2+1); // Only File and Console transports + 1 Exception stream
      expect(logger.transports[2].type).to.equal(undefined);
    });
  
    it("should add BetterStack transport in non-test mode", function () {
      configStub.mode.test = false; // disable test mode
  
      const { logger } = proxyquire("../../src/controllers/logger.controller", {
        "../config": configStub
      });
  
      // verify that the transport is added
      expect(logger.transports.length).to.equal(3+2); // File, Console, Stream transports + 2 Exception streams
      expect(logger.transports[2]).to.be.an.instanceOf(Object);
    });
  });
  
  describe("Logger LogtailStream class", () => {
    let mockLogtail, LogtailStream
  
    beforeEach(function() {
      // create a mock Logtail instance
      mockLogtail = {
        log: sinon.stub()
      };
  
      // enable test mode to export LogtailStream
      configStub.mode.test = true;
  
      // load the module to access LogtailStream
      const loggerModule = proxyquire("../../src/controllers/logger.controller", {
        "../config": configStub,
        "@logtail/node": { Logtail: sinon.stub().returns(mockLogtail) }
      });
  
      // access LogtailStream
      LogtailStream = loggerModule.LogtailStream;
    });
  
    /*
    it("should construct log messages correctly", (done) => {
      const logtailStream = new LogtailStream(mockLogtail);
  
      const info = {
        level: "error",
        message: "Test message",
        [Symbol.for("splat")]: ["arg1", "arg2"]
      };
  
      mockLogtail.log.resolves();
  
      logtailStream._write(info, null, (err) => {
        expect(err).to.be.undefined;
        expect(mockLogtail.log.calledOnce).to.be.true;
        expect(mockLogtail.log.firstCall.args[0]).to.equal("[ERROR] Test message arg1 arg2");
        done();
      });
    });
    */
    
    /*
    it("should decode encoded characters in log messages", (done) => {
      const logtailStream = new LogtailStream(mockLogtail);
  
      const info = {
        level: "error",
        message: "Test & message",
        [Symbol.for("splat")]: []
      };
  
      mockLogtail.log.resolves();
  
      logtailStream._write(info, null, (err) => {
        expect(err).to.be.undefined;
        expect(mockLogtail.log.calledOnce).to.be.true;
        expect(mockLogtail.log.firstCall.args[0]).to.equal("[ERROR] Test & message");
        done();
      });
    });
    */
  
    /*
    it("should handle errors during log writing", (done) => {
      const logtailStream = new LogtailStream(mockLogtail);
  
      const info = {
        level: "error",
        message: "Test message",
        [Symbol.for("splat")]: []
      };
  
      mockLogtail.log.rejects(new Error("Logtail error"));
  
      logtailStream._write(info, null, (err) => {
        expect(err).to.be.an("error");
        expect(err.message).to.equal("Logtail error");
        done();
      });
    });
    */
    
    /*
    it("should handle Symbol(splat) with non-string arguments", function(done) {
      const logtailStream = new LogtailStream(mockLogtail);
      
      const splatSymbol = Symbol.for("splat");
      const info = {
        level: "info",
        message: "Test",
        [splatSymbol]: [{ foo: "bar" }, 123] // non-string arguments
      };
    
      mockLogtail.log.resolves();
    
      logtailStream._write(info, null, (err) => {
        expect(mockLogtail.log.firstCall.args[0]).to.equal(
          "[INFO] Test {\"foo\":\"bar\"} 123"
        );
        done();
      });
    });
    */

    /*
    it("should handle Symbol(splat) with string arguments", function(done) {
      const logtailStream = new LogtailStream(mockLogtail);
      
      const splatSymbol = Symbol.for("splat");
      const info = {
        level: "info",
        message: "Test",
        [splatSymbol]: ["simple string"]
      };
    
      mockLogtail.log.resolves();
    
      logtailStream._write(info, null, (err) => {
        expect(mockLogtail.log.firstCall.args[0]).to.equal(
          "[INFO] Test simple string"
        );
        done();
      });
    });
    */
    
    /*
    it("should handle missing Symbol(splat)", function(done) {
      const logtailStream = new LogtailStream(mockLogtail);
      
      const info = {
        level: "info",
        message: "Test"
        // no splat symbol
      };
    
      mockLogtail.log.resolves();
    
      logtailStream._write(info, null, (err) => {
        expect(mockLogtail.log.firstCall.args[0]).to.equal("[INFO] Test");
        done();
      });
    });
    */

  });

});
