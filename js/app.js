/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code with PKCE oAuth2 flow to authenticate 
 * against the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
 */

// #region VARIABLES DE ENTORNO
// your clientId
const clientId = 'e2f650471db0457a962a675206842bb1';
// your redirect URL - must be localhost URL and/or HTTPS
const redirectUrl = 'https://romaning.github.io';

const authorizationEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";
const apiEndpoint = "https://api.spotify.com";
//const scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private ugc-image-upload';
//const scope = 'ugc-image-upload user-read-playback-state user-modify-playback-state user-read-currently-playing app-remote-control streaming playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-follow-modify user-follow-read user-read-playback-position user-read-recently-played user-library-modify user-library-read user-read-email user-read-private user-soa-link user-soa-unlink soa-manage-entitlements soa-manage-partner soa-create-partner'
const scope = 'user-read-playback-state user-modify-playback-state user-read-currently-playing user-top-read streaming user-read-email user-read-private playlist-modify-public playlist-modify-private user-read-recently-played user-library-modify user-library-read'
//#endregion 

//#region ENTITIES (Getters y Setters) y DATABASES
//#region pregunta 
// ¿Se puede instanciar una funcion como si fuese una clase, asimilando que una funcion podria ser equivalente a una clase en JAVA o C# (POO)?
// respuesta: si, una funcion de javascript podria ser como una clase de JAVA, donde se tiene metodos y atributos, puede instanciarse y acceder a sus metodos
//#endregion
// Estructura de datos que administra el token activo actual y lo almacena en cache en localStorage
const currentToken = {

  // aqui falta el cnstructor pero eso se lo dejamos a las clases de verdad
  // aqui faltan los atributos que deben ser privados, pero eso tambien lo dejamos a las clases por el momento

  // Funciones GETTERS
  // estos son los getters, se usanar despues de haber seteado
  get access_token() {
    return localStorage.getItem('access_token') || null;
  },

  get refresh_token() {
    return localStorage.getItem('refresh_token') || null;
  },

  get expires_in() {
    return localStorage.getItem('refresh_in') || null
  },

  get expires() {
    return localStorage.getItem('expires') || null
  },

  // Metodos SETTERS
  // Estos son los setters, se usa antes para guardar y luego se recuperar con los getters
  save: function (response) {
    const { access_token, refresh_token, expires_in } = response;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('expires_in', expires_in);

    const now = new Date();
    const expiry = new Date(now.getTime() + (expires_in * 1000));
    localStorage.setItem('expires', expiry);
  }
};
//#endregion


//#region SERVICES - Llamada a las APIs de Spotify
// Servicio para obtener un token
async function getToken(code) {
  const code_verifier = localStorage.getItem('code_verifier');

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUrl,
      code_verifier: code_verifier,
    }),
  });

  return await response.json();
}

// El servicio que solicita al end point para pedir un nuevo toke a partir de la anterior
async function refreshToken() {
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: currentToken.refresh_token
    }),
  });

  return await response.json();
}

// El servicio para obtener los datos del usuario
async function getUserData() {
  const response = await fetch(`${apiEndpoint}/v1/me`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + currentToken.access_token },
  });

  return await response.json();
}

/* 
  SERVICIO comodin
  Servicio  para recibir la URL, METODO HTTP (get, post, put, path, delete) y el cuerpo
   - Obtener lista de canciones, (endpoint)
   - Crear playlist y agregarlo (endpoint y body)
*/
async function fetchWebApi(endpoint, method, body) {
  const response = await fetch(`${apiEndpoint}/${endpoint}`, {
    method: method,
    headers: {
      'Authorization': 'Bearer ' + currentToken.access_token
    },
    body: JSON.stringify(body)
    //body: JSON.stringify(body)
    // body: new URLSearchParams({
    //   client_id: clientId,
    // }),
  });
  return await response.json();
}
//#endregion

//#region VIEWS
/* 
  Representacion de plantillas HTML con enlace de datos básico (solo software de demostracion).
  aqui funciona igual que en ANGULAR con los Data Binding (OneWay Binding o Two Way DataBinding)

  - para refresar el token
  renderTemplate("oauth", "oauth-template", currentToken); #oauth-template

  - si tenemos token, mostrar datos
  renderTemplate("main", "logged-in-template", userData); #logged-in-template
  renderTemplate("oauth", "oauth-template", currentToken); #oauth-template

  - si NO tenemos token 
  renderTemplate("main", "login");
*/
function renderTemplate(targetId /* a donde se renderiza */, templateId /* que plantilla agarraremos para visualizar */, data = null) {
  const template = document.getElementById(templateId);
  const clone = template.content.cloneNode(true);
  // Seleccionamos todos los elementos dentro de la plantilla que vamos a mostrar dentro de main o oauth
  const elements = clone.querySelectorAll("*");
  elements.forEach(ele => {

    // Tomamos todo aquello que tenga data-bind como propiedad como si fuese un ng-model
    const bindingAttrs = [...ele.attributes].filter(a => a.name.startsWith("data-bind"));

    // Recorremos cada elemento
    bindingAttrs.forEach(attr => {
      const target = attr.name.replace(/data-bind-/, "").replace(/data-bind/, "");
      const targetType = target.startsWith("onclick") ? "HANDLER" : "PROPERTY";
      const targetProp = target === "" ? "innerHTML" : target;

      const prefix = targetType === "PROPERTY" ? "data." : "";
      const expression = prefix + attr.value.replace(/;\n\r\n/g, "");

      // quiza seria mejor utilizar un framework para validaciones aqui (documentacion)
      try {
        ele[targetProp] = targetType === "PROPERTY" ? eval(expression) : () => { eval(expression) };
        ele.removeAttribute(attr.name);
      } catch (ex) {
        console.error(`Error binding ${expression} to ${targetProp}`, ex);
      }
    });
  });

  const target = document.getElementById(targetId);
  target.innerHTML = "";
  target.appendChild(clone);
}

//#region like CONTROLLER
async function redirectToSpotifyAuthorize() {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = crypto.getRandomValues(new Uint8Array(64));
  const randomString = randomValues.reduce((acc, x) => acc + possible[x % possible.length], "");

  const code_verifier = randomString;
  const data = new TextEncoder().encode(code_verifier);
  const hashed = await crypto.subtle.digest('SHA-256', data);

  const code_challenge_base64 = btoa(String.fromCharCode(...new Uint8Array(hashed)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  window.localStorage.setItem('code_verifier', code_verifier);

  const authUrl = new URL(authorizationEndpoint)
  const params = {
    response_type: 'code',
    client_id: clientId,
    scope: scope,
    code_challenge_method: 'S256',
    code_challenge: code_challenge_base64,
    redirect_uri: redirectUrl,
  };

  authUrl.search = new URLSearchParams(params).toString();
  // Redireccionar al usuario al login para autenticarse con el servidor
  // Redirigir al usuario al servidor de autorización para iniciar sesion
  window.location.href = authUrl.toString();
}

// 1. Función declarativa
// Se activan como controladores, realizan algo o escriben en la BD directamente, obtienen token, permite la salida del sistema
async function loginWithSpotifyClick() {
  await redirectToSpotifyAuthorize();
}

// 2. Función expresiva
let logoutClick = async function () {
  localStorage.clear();
  window.location.href = redirectUrl;
}

// 1. Función declarativa
// Aqui tenemos la funcion de RENOVAR EL TOKEN
async function refreshTokenClick() {
  const token = await refreshToken();
  currentToken.save(token);
  renderTemplate("oauth", "oauth-template", currentToken);
}

// funcion para obtener las 5 mas escuchadas
let getTopTracks = async () => { (await fetchWebApi('v1/me/top/tracks?time_range=long_term&limit=5', 'GET')).items;}

async function getTracksClick() {
  const topTracks = await getTopTracks();
  console.log(
    topTracks?.map(
      ({ name, artists }) => `${name} by ${artists.map(artist => artist.name).join(', ')}`
    )
  );
}

// Funcion Guardar las N canciones seleccionadas a un playlist llamado "My Top tracks playlist"
async function createPlaylist(tracksUri) {

  // Obtengo mi ID de usuario
  const { id: user_id } = await fetchWebApi('v1/me', 'GET')

  // Crear una playlist
  const playlist = await fetchWebApi(
    `v1/users/${user_id}/playlists`,
    'POST',
    {
      "name": "Las cinco mas escucadas",
      "description": "Playlist creada desde la pagina de desarrollo",
      "public": false
    }
  )

  // Agregar las canciones seleccionadas en la playlist creada
  await fetchWebApi(
    `v1/playlists/${playlist.id}/tracks?uris=${tracksUri.join(',')}`,
    'POST'
  );

  return playlist;
}

async function createPlaylistAndAddTracksClick() {
  // lsita de cnaciones seleccionadas para guardar
  const tracksUri = [
    'spotify:track:3qQbCzHBycnDpGskqOWY0E', 'spotify:track:6otePxalBK8AVa20xhZYVQ', 'spotify:track:3nc420PXjTdBV5TN0gCFkS', 'spotify:track:4jp4Z02kzzg8gK0NmDGgml', 'spotify:track:5a1Cm3iYkS0nWn9fTijOq4'
  ];

  const createdPlaylist = await createPlaylist(tracksUri);
  console.log(createdPlaylist.name, createdPlaylist.id);
}

async function getPlayListsUser(){
  const Playlists = await fetchWebApi(
      `v1/me/playlists`,
      'GET'
  );

  return Playlists;
}
//#endregion

//#region MAIN
// Al cargar la página, intente obtener el código de autorización de la URL de búsqueda del navegador actual
// AL CARGAR EL NAVEGADOR OBTENER RAPIDAMENTE SI CODE EXISTE
const args = new URLSearchParams(window.location.search);
const code = args.get('code');

// Si encontramos un código, estamos en una devolución de llamada, hacemos un intercambio de tokens
// Si encuentro el code con contenido entonces
console.log(code)
if (code) {
  console.log("Ingresa a otbtener token");
  const token = await getToken(code);
  console.log(token);
  console.log("Guardamos el token en el local storage");
  currentToken.save(token);

  // Eliminar el código de la URL para que podamos actualizar correctamente.
  // Eliminar el code desde el URL para que nosotros podamos refrescar correcatmente
  console.log("Obtenemos el href de windows");
  const url = new URL(window.location.href);
  console.log(url);
  console.log("eliminamos code del url");
  url.searchParams.delete("code");
  console.log(url);

  console.log("buscamos reemplazar algo");
  const updatedUrl = url.search ? url.href : url.href.replace('?', '');
  console.log(updatedUrl);
  window.history.replaceState({}, document.title, updatedUrl);
}

// Si tenemos un token, hemos iniciado sesión, por lo que obtenemos los datos del usuario y representamos la plantilla de inicio de sesión.
// Si tenemos un token, si estamos LOGEADOS, entonces mostramos la pagina de logeado, MOSTRANDO todos los DATOS DEL USUARIO
if (currentToken.access_token) {
  const userData = await getUserData();
  //solo en un lugar sucede esto
  renderTemplate("slot-user-img", "user-loged-img", userData);
  renderTemplate("main", "logged-in-template", userData);
  renderTemplate("oauth", "oauth-template", currentToken);

  const playlists = await getPlayListsUser();
  console.log(playlists);
}

// De lo contrario, no iniciaremos sesión, por lo que renderizaremos la plantilla de inicio de sesión.
// Si NO tenemos un token, si NO estamos logeados, entonces mostrar pagina de login
if (!currentToken.access_token) {
  renderTemplate("slot-user-img", "login");
}
//#endregion


window.onSpotifyWebPlaybackSDKReady = () => {
  const token = currentToken.access_token;
  const player = new Spotify.Player({
    name: 'Web Playback SDK Quick Start Player',
    getOAuthToken: cb => {
      cb(token);
    },
    volume: 0.5
  });

  // Ready
  player.addListener('ready', ({device_id}) => {
    console.log('Ready with Device ID', device_id);
  });

  // Not Ready
  player.addListener('not_ready', ({device_id}) => {
    console.log('Device ID has gone offline', device_id);
  });

  player.addListener('initialization_error', ({message}) => {
    console.error(message);
  });

  player.addListener('authentication_error', ({message}) => {
    console.error(message);
  });

  player.addListener('account_error', ({message}) => {
    console.error(message);
  });

  document.getElementById('togglePlay').onclick = function () {
    player.togglePlay();
  };

  player.connect().then(success => {
    if (success) {
      console.log('The Web Playback SDK successfully connected to Spotify!');
    }
  })
}