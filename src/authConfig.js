export const msalConfig = {
  auth: {
    clientId: "33d7afc2-f2d7-4b7b-917c-0ca44205a372",           // App Registration → Application (client) ID
    authority: "https://login.microsoftonline.com/e0a16fc3-6382-43ac-ba07-e48f645547ee",
    redirectUri: "http://localhost:3000",  // Ajoutez aussi l'URL de prod ici
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ["User.Read"],
};