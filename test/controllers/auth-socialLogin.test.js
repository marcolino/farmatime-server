const sinon = require("sinon");
const chai = require("chai");
const proxyquire = require("proxyquire");
const expect = chai.expect;
const User = require("../../src/models/user.model.js");
const Role = require("../../src/models/role.model.js");
const Plan = require("../../src/models/plan.model.js");
const demoData = require("../../data/demo.js");

const stubRedirectToClientWithError = sinon.stub();
const stubRedirectToClientWithSuccess = sinon.stub();
const mockRoles = [{ _id: "roleId" }];
const mockPlan = { _id: "planId" };
const mockLogger = {
  error: sinon.spy(),
  info: sinon.spy(),
};
const mockAudit = sinon.spy();
const mockCreateTokensAndCookies = sinon.stub();

// Use proxyquire to inject the mocked logger into auth.controller.js
const authController = proxyquire("../../src/controllers/auth.controller", {
  "./logger.controller": { logger: mockLogger },
  "../libs/messaging": { audit: mockAudit },
  "../libs/misc": {
    redirectToClientWithError: stubRedirectToClientWithError,
    redirectToClientWithSuccess: stubRedirectToClientWithSuccess,
    createTokensAndCookies: mockCreateTokensAndCookies,
  },
});

//const { socialLogin } = authController; // TODO... uncomment this line and change authController.socialLogin to socialLogin ...

describe("Auth social login controller", () => {
  let req, res, next, stubUserFindOne, stubUserCreate, stubRoleFindOne, stubPlanFindOne;

  beforeEach(() => {
    // Mock request, response, and next
    req = {
      userSocial: demoData.users.userSocial,
      t: (key, params) => {
        if (params) {
          Object.keys(params).forEach((p) => (key = key.replace(`{{${p}}}`, params[p])));
        }
        return key;
      },
      language: "en",
    };
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
      redirect: sinon.stub(),
    };
    next = sinon.stub();

    // Reinitialize stubs for each test
    stubUserFindOne = sinon.stub(User, "findOne");
    stubUserFindOne.withArgs({ email: "donnie@mail.com" }).returns({
      populate: sinon.stub()
        .withArgs("roles", "-__v").returns({
          populate: sinon.stub()
            .withArgs("plans", "-__v").returns({
              exec: sinon.stub().resolves({
                _id: "user123",
                email: "donnie@mail.com",
                roles: [{ name: "user" }],
                plans: [{ name: "free" }]
              })
            })
        })
    });

    stubUserFindOne.withArgs({ email: "new@mail.com" }).returns({
      populate: sinon.stub().returns({
        populate: sinon.stub().returns({
          exec: sinon.stub().resolves(null), // No user found
        }),
      }),
    });

    stubUserCreate = sinon.stub(User, "create");
    stubUserCreate.withArgs({ email: "new@mail.com" }).resolves({
      email: "new@mail.com",
      password: "",
      socialId: "provider:123",
      firstName: "firstName",
      lastName: "lastName",
      roles: [{ _id: "roleId" }],
      plan: { _id: "planId" },
      language: "en",
      isVerified: true, // social authorized user is verified automatically
      isDeleted: false,
    });
    stubUserCreate.withArgs({ email: "deleted@mail.com" }).resolves({
      email: "new@mail.com",
      password: "",
      socialId: "provider:123",
      firstName: "firstName",
      lastName: "lastName",
      roles: [{ _id: "roleId" }],
      plan: { _id: "planId" },
      language: "en",
      isVerified: true, // social authorized user is verified automatically
      isDeleted: false,
    });

    // stubRoleFindOne = sinon.stub(Role, "findOne");
    stubRoleFindOne = sinon.stub(Role, "findOne").resolves({
      _id: "role123",
      name: "user",
    });
    stubRoleFindOne.withArgs({ name: "not-existing-role-name" }).resolves(
      null
    );
    stubPlanFindOne = sinon.stub(Plan, "findOne").resolves({
      _id: "plan123",
      name: "free",
    });

    // reset history for shared mocks
    stubRedirectToClientWithError.resetHistory();
    stubRedirectToClientWithSuccess.resetHistory();
    mockLogger.error.resetHistory();
    mockLogger.info.resetHistory();
    mockAudit.resetHistory();
  });

  afterEach(() => {
    // restore all stubs and mocks to prevent state leakage
    sinon.restore();
    mockCreateTokensAndCookies.reset();
    mockCreateTokensAndCookies.resetHistory();
  });


  it("should handle missing userSocial", async () => {
    req.userSocial = undefined;
    await authController.socialLogin(req, res, next);
    expect(stubRedirectToClientWithError.calledOnce).to.be.true;
  });

  it("should handle user found but not verified", async () => {
    stubUserFindOne.resolves({
      isVerified: false,
      isDeleted: false,
      roles: mockRoles,
      plan: mockPlan,
    });
    await authController.socialLogin(req, res, next);
    expect(stubRedirectToClientWithError.calledOnce).to.be.true;
    expect(stubRedirectToClientWithError.args[0][2].code).to.equal("ACCOUNT_WAITING_FOR_VERIFICATION");
  });

  it("should create a new user if not found", async () => {
      req.userSocial.email = "new@mail.com"; // Set email for new user creation
      await authController.socialLogin(req, res, next); // Call the function
      expect(User.create.calledOnce).to.be.true; // Check if create was called once
  });

  it("should handle user found, deleted", async () => {
    stubUserFindOne.withArgs({ email: "deleted@mail.com" }).returns({
      populate: sinon.stub().returns({
        populate: sinon.stub().returns({
          exec: sinon.stub().resolves({
            save: sinon.stub().resolves(),
            email: "deleted@mail.com",
            password: "",
            socialId: "provider:123",
            firstName: "firstName",
            lastName: "lastName",
            roles: [{ _id: "roleId" }],
            plan: { _id: "planId" },
            language: "en",
            isVerified: true,
            isDeleted: false,
          }),
        }),
      }),
    });
    req.userSocial.email = "deleted@mail.com";
    await authController.socialLogin(req, res, next);
    //expect(stubRedirectToClientWithSuccess.calledOnce).to.be.true; // TODO ...
  });
  
  it("should handle save error for user found", async () => {
    const user = {
      save: sinon.stub().resolves(),
      email: "found@mail.com",
      password: "",
      socialId: "provider:123",
      firstName: "firstName",
      lastName: "lastName",
      roles: [{ _id: "roleId" }],
      plan: { _id: "planId" },
      language: "en",
      isVerified: true,
      isDeleted: true,
    };
    stubUserFindOne.withArgs({ email: user.email }).returns({
      populate: sinon.stub().returns({
        populate: sinon.stub().returns({
          exec: sinon.stub().resolves(user),
        }),
      }),
    });
    req.userSocial.email = user.email;
    user.save.rejects(new Error("Save error"));
    await authController.socialLogin(req, res, next);
    expect(stubRedirectToClientWithError.calledOnce).to.be.true;
  });

  it("should handle user with role not found", async () => {
    stubUserFindOne.withArgs({ email: "no-role-user@mail.com" }).returns({
      populate: sinon.stub()
        .withArgs("roles", "-__v").returns({
          populate: sinon.stub()
            .withArgs("plan", "-__v").returns({
              exec: sinon.stub().resolves({
                _id: "user123",
                email: "no-role-user@mail.com",
                roles: [],
                plan: { name: "free" }
              })
            })
        })
    });
    await authController.socialLogin(req, res, next);
    expect(stubRedirectToClientWithError.calledOnce).to.be.true;
  });
  
  it("should handle user with plan not found", async () => {
    stubUserFindOne.withArgs({ email: "no-plan-user@mail.com" }).returns({
      populate: sinon.stub()
        .withArgs("roles", "-__v").returns({
          populate: sinon.stub()
            .withArgs("plan", "-__v").returns({
              exec: sinon.stub().resolves({
                _id: "user123",
                email: "no-plan-user@mail.com",
                roles: [{ _id: "roleId" }],
                plan: { }
              })
            })
        })
    });
    await authController.socialLogin(req, res, next);
    expect(stubRedirectToClientWithError.calledOnce).to.be.true;
  });
  
  it("should handle role not found", async () => {
    stubRoleFindOne.withArgs({ name: "user" }).returns(null);
    await authController.socialLogin(req, res, next);
    expect(stubRedirectToClientWithError.calledOnce).to.be.true;
  });

  it("should handle role find error ", async () => {
    stubUserFindOne.withArgs({ email: "not-found@mail.com" }).returns({
      populate: sinon.stub().returns({
        populate: sinon.stub().returns({
          exec: sinon.stub().resolves(null),
        }),
      }),
    });
    req.userSocial.email = "not-found@mail.com";
    stubRoleFindOne.withArgs({ name: "user" }).throws(new Error("Role find error"));
    await authController.socialLogin(req, res, next);
    expect(stubRedirectToClientWithError.calledOnce).to.be.true;
  });

  it("should handle plan find error", async () => {
    stubUserFindOne.withArgs({ email: "not-found@mail.com" }).returns({
      populate: sinon.stub().returns({
        populate: sinon.stub().returns({
          exec: sinon.stub().resolves(null),
        }),
      }),
    });
    req.userSocial.email = "not-found@mail.com";
    stubPlanFindOne.withArgs({ name: "free" }).throws(new Error("Plan find error"));
    await authController.socialLogin(req, res, next);
    expect(stubRedirectToClientWithError.calledOnce).to.be.true;
  });
  
  it("should handle role not found", async () => {
    stubUserFindOne.withArgs({ email: "not-found@mail.com" }).returns({
      populate: sinon.stub().returns({
        populate: sinon.stub().returns({
          exec: sinon.stub().resolves(null),
        }),
      }),
    });
    req.userSocial.email = "not-found@mail.com";
    stubRoleFindOne.withArgs({ name: "user" }).returns(null);
    await authController.socialLogin(req, res, next);
    expect(stubRedirectToClientWithError.calledOnce).to.be.true;
  });

  it("should handle plan not found", async () => {
    stubUserFindOne.withArgs({ email: "not-found@mail.com" }).returns({
      populate: sinon.stub().returns({
        populate: sinon.stub().returns({
          exec: sinon.stub().resolves(null),
        }),
      }),
    });
    req.userSocial.email = "not-found@mail.com";
    stubPlanFindOne.withArgs({ name: "free" }).returns(null);
    await authController.socialLogin(req, res, next);
    expect(stubRedirectToClientWithError.calledOnce).to.be.true;
  });

  it("should handle user creation error", async () => {
    stubUserFindOne.withArgs({ email: "new-user@mail.com" }).returns({
      populate: sinon.stub()
      .withArgs("roles", "-__v").returns({
        populate: sinon.stub()
        .withArgs("plans", "-__v").returns({
          exec: sinon.stub().resolves(null)
        })
      })
    });
    req.userSocial.email = "new-user@mail.com";
    User.create.throws(new Error("Creation error"));
    await authController.socialLogin(req, res, next);
    expect(stubRedirectToClientWithError.calledOnce).to.be.true;
  });

  it("should handle user save error", async () => {
    //User.save.throws(new Error("Save error"));
    const user = new User({ email: demoData.users.userSocial.email });
    sinon.stub(user, "save").throws(new Error("Save error"));
    await authController.socialLogin(req, res, next);
    expect(stubRedirectToClientWithError.calledOnce).to.be.true;
  });
  
  it("should handle token creation error", async () => {
    stubUserFindOne.withArgs({ email: "donnie@mail.com" }).returns({
      populate: sinon.stub()
        .withArgs("roles", "-__v").returns({
          populate: sinon.stub()
            .withArgs("plan", "-__v").returns({
              exec: sinon.stub().resolves({
                save: sinon.stub().resolves(),
                _id: "user123",
                email: "donnie@mail.com",
                roles: [{ _id: "roleId" }],
                plan: {},
                isVerified: true,
              })
            })
        })
    });

    mockCreateTokensAndCookies.throws(new Error("Token error"));
    await authController.socialLogin(req, res, next);
    expect(stubRedirectToClientWithError.calledOnce).to.be.true;
  });

  /*
  it("should call audit and logger info and redirectToClientWithSuccess on createTokensAndCookies success", async () => {

    stubUserFindOne.withArgs({ email: "new-user@mail.com" }).returns({
      populate: sinon.stub()
        .withArgs("roles", "-__v").returns({
          populate: sinon.stub()
            .withArgs("plans", "-__v").returns({
              exec: sinon.stub().resolves({
                save: sinon.stub().resolves(),
                _id: "user123",
                email: "new-user@mail.com",
                roles: [{ name: "user" }],
                plans: [{ name: "free" }],
                isVerified: true,
                isDeleted: false,
              })
            })
        })
    });
    req.userSocial.email = "new-user@mail.com";
    await authController.socialLogin(req, res, next);
    expect(mockLogger.info.calledOnce).to.be.true;
    expect(mockAudit.calledOnce).to.be.true;
    //expect(stubRedirectToClientWithSuccess.calledOnce).to.be.true; // TODO ...
  });
*/
  
  it("should call audit and logger info and redirectToClientWithError on createTokensAndCookies error", async () => {
    stubUserFindOne.withArgs({ email: "new-user@mail.com" }).returns({
      populate: sinon.stub()
      .withArgs("roles", "-__v").returns({
        populate: sinon.stub()
        .withArgs("plans", "-__v").returns({
          exec: sinon.stub().resolves({
            save: sinon.stub().resolves(),
            _id: "user123",
            email: "new-user@mail.com",
            roles: [{ name: "user" }],
            plans: [{ name: "free" }],
            isVerified: true,
            isDeleted: false,
          })
        })
      })
    });
    mockCreateTokensAndCookies.throws(new Error("Token error"));
    req.userSocial.email = "new-user@mail.com";
    await authController.socialLogin(req, res, next);
    //expect(mockLogger.info.calledOnce).to.be.true;
    expect(mockAudit.calledOnce).to.be.true;
    expect(stubRedirectToClientWithError.calledOnce).to.be.true;
  });
  
  it("should handle database error when finding user", async () => {
    User.findOne.throws(new Error("Database error"));
    await authController.socialLogin(req, res, next);
    expect(stubRedirectToClientWithError.calledOnce).to.be.true;
  });

  it("should handle database error when finding role", async () => {
    Role.findOne.throws(new Error("Database error"));
    await authController.socialLogin(req, res, next);
    expect(stubRedirectToClientWithError.calledOnce).to.be.true;
  });

  it("should handle database error when finding plan", async () => {
    Plan.findOne.throws(new Error("Database error"));
    await authController.socialLogin(req, res, next);
    expect(stubRedirectToClientWithError.calledOnce).to.be.true;
  });

});
