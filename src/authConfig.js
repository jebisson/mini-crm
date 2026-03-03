export const msalConfig = {
  auth: {
    clientId: "33d7afc2-f2d7-4b7b-917c-0ca44205a372",
    authority: "https://login.microsoftonline.com/e0a16fc3-6382-43ac-ba07-e48f645547ee",
    redirectUri: "https://ashy-smoke-02882c00f.6.azurestaticapps.net",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ["User.Read"],
};