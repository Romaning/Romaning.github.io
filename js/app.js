/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code with PKCE oAuth2 flow to authenticate
 * against the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
 */
var imgLike = 'https://misc.scdn.co/liked-songs/liked-songs-300.jpg'
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
        const {access_token, refresh_token, expires_in} = response;
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
        headers: {'Authorization': 'Bearer ' + currentToken.access_token},
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
                ele[targetProp] = targetType === "PROPERTY" ? eval(expression) : () => {
                    eval(expression)
                };
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
let getTopTracks = async () => {
    (await fetchWebApi('v1/me/top/tracks?time_range=long_term&limit=5', 'GET')).items;
}

async function getTracksClick() {
    const topTracks = await getTopTracks();
    console.log(
        topTracks?.map(
            ({name, artists}) => `${name} by ${artists.map(artist => artist.name).join(', ')}`
        )
    );
}

// Funcion Guardar las N canciones seleccionadas a un playlist llamado "My Top tracks playlist"
async function createPlaylist(tracksUri) {

    // Obtengo mi ID de usuario
    const {id: user_id} = await fetchWebApi('v1/me', 'GET')

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

async function showTracksPlayList(id) {
    console.log("entra" + id)
    const tracks = await fetchWebApi(
        `v1/playlists/${id}`,
        'GET'
    );
    const div = document.querySelector('.emb.content');
    div.removeAttribute('hidden');
    const iframe = document.querySelector('.iframe-iframe');
    iframe.setAttribute('src', 'https://open.spotify.com/embed/playlist/' + id + '?utm_source=generator&theme=0');
    const viewCategories = document.querySelector('.view-categories');
    viewCategories.hidden = true;
    console.log(tracks)
}

async function getPlayListsUser() {
    const Playlists = await fetchWebApi(
        `v1/me/playlists?limit=50`,
        'GET'
    );

    return Playlists;
}

const datosia = {
    "href": "https://api.spotify.com/v1/users/kka1knztq7aigfnz8uao26vqq/playlists?offset=0&limit=50&locale=es-419,es;q%3D0.9,en;q%3D0.8",
    "limit": 50,
    "next": null,
    "offset": 0,
    "previous": null,
    "total": 10,
    "items": [
        {
            "collaborative": false,
            "description": "",
            "external_urls": {
                "spotify": "https://open.spotify.com/playlist/4WGMv9kdvbxG3fvPUxeMv5"
            },
            "href": "https://api.spotify.com/v1/playlists/4WGMv9kdvbxG3fvPUxeMv5",
            "id": "4WGMv9kdvbxG3fvPUxeMv5",
            "images": [
                {
                    "height": null,
                    "url": "https://i.scdn.co/image/ab67616d00001e02755a9f1e89ad8e8cf91d4956",
                    "width": null
                }
            ],
            "name": "Timabaland",
            "owner": {
                "display_name": "Roman",
                "external_urls": {
                    "spotify": "https://open.spotify.com/user/kka1knztq7aigfnz8uao26vqq"
                },
                "href": "https://api.spotify.com/v1/users/kka1knztq7aigfnz8uao26vqq",
                "id": "kka1knztq7aigfnz8uao26vqq",
                "type": "user",
                "uri": "spotify:user:kka1knztq7aigfnz8uao26vqq"
            },
            "primary_color": null,
            "public": true,
            "snapshot_id": "AAAAAzsCHLud3WN0gfCKknrsvh+gUbik",
            "tracks": {
                "href": "https://api.spotify.com/v1/playlists/4WGMv9kdvbxG3fvPUxeMv5/tracks",
                "total": 1
            },
            "type": "playlist",
            "uri": "spotify:playlist:4WGMv9kdvbxG3fvPUxeMv5"
        },
        {
            "collaborative": false,
            "description": "",
            "external_urls": {
                "spotify": "https://open.spotify.com/playlist/6s1hVwZ0SwNydt8ZrXior5"
            },
            "href": "https://api.spotify.com/v1/playlists/6s1hVwZ0SwNydt8ZrXior5",
            "id": "6s1hVwZ0SwNydt8ZrXior5",
            "images": [
                {
                    "height": 640,
                    "url": "https://mosaic.scdn.co/640/ab67616d00001e020f63311a0099522a191314b6ab67616d00001e021917a0f3f4152622a040913fab67616d00001e025409d6da4f0a9aa86edd4ef4ab67616d00001e02b5d4b4ed17ec86c4b3944af2",
                    "width": 640
                },
                {
                    "height": 300,
                    "url": "https://mosaic.scdn.co/300/ab67616d00001e020f63311a0099522a191314b6ab67616d00001e021917a0f3f4152622a040913fab67616d00001e025409d6da4f0a9aa86edd4ef4ab67616d00001e02b5d4b4ed17ec86c4b3944af2",
                    "width": 300
                },
                {
                    "height": 60,
                    "url": "https://mosaic.scdn.co/60/ab67616d00001e020f63311a0099522a191314b6ab67616d00001e021917a0f3f4152622a040913fab67616d00001e025409d6da4f0a9aa86edd4ef4ab67616d00001e02b5d4b4ed17ec86c4b3944af2",
                    "width": 60
                }
            ],
            "name": "Descubriendo",
            "owner": {
                "display_name": "Roman",
                "external_urls": {
                    "spotify": "https://open.spotify.com/user/kka1knztq7aigfnz8uao26vqq"
                },
                "href": "https://api.spotify.com/v1/users/kka1knztq7aigfnz8uao26vqq",
                "id": "kka1knztq7aigfnz8uao26vqq",
                "type": "user",
                "uri": "spotify:user:kka1knztq7aigfnz8uao26vqq"
            },
            "primary_color": null,
            "public": true,
            "snapshot_id": "AAAABeuYR7IMsXC2kknO+1muMwzAO624",
            "tracks": {
                "href": "https://api.spotify.com/v1/playlists/6s1hVwZ0SwNydt8ZrXior5/tracks",
                "total": 4
            },
            "type": "playlist",
            "uri": "spotify:playlist:6s1hVwZ0SwNydt8ZrXior5"
        },
        {
            "collaborative": false,
            "description": "",
            "external_urls": {
                "spotify": "https://open.spotify.com/playlist/08dWJ0fEK7gFz5nN3aFlnt"
            },
            "href": "https://api.spotify.com/v1/playlists/08dWJ0fEK7gFz5nN3aFlnt",
            "id": "08dWJ0fEK7gFz5nN3aFlnt",
            "images": [
                {
                    "height": 640,
                    "url": "https://mosaic.scdn.co/640/ab67616d00001e023298b9f621f76cff99aa3f21ab67616d00001e02886da61fb5e8af44fbe1761fab67616d00001e02ad5b2167b8853c1a9d25c97bab67616d00001e02e00782865bf36a54ac28f225",
                    "width": 640
                },
                {
                    "height": 300,
                    "url": "https://mosaic.scdn.co/300/ab67616d00001e023298b9f621f76cff99aa3f21ab67616d00001e02886da61fb5e8af44fbe1761fab67616d00001e02ad5b2167b8853c1a9d25c97bab67616d00001e02e00782865bf36a54ac28f225",
                    "width": 300
                },
                {
                    "height": 60,
                    "url": "https://mosaic.scdn.co/60/ab67616d00001e023298b9f621f76cff99aa3f21ab67616d00001e02886da61fb5e8af44fbe1761fab67616d00001e02ad5b2167b8853c1a9d25c97bab67616d00001e02e00782865bf36a54ac28f225",
                    "width": 60
                }
            ],
            "name": "Salay",
            "owner": {
                "display_name": "Roman",
                "external_urls": {
                    "spotify": "https://open.spotify.com/user/kka1knztq7aigfnz8uao26vqq"
                },
                "href": "https://api.spotify.com/v1/users/kka1knztq7aigfnz8uao26vqq",
                "id": "kka1knztq7aigfnz8uao26vqq",
                "type": "user",
                "uri": "spotify:user:kka1knztq7aigfnz8uao26vqq"
            },
            "primary_color": null,
            "public": true,
            "snapshot_id": "AAAARj0C4WAnizh5MYFxR4Fm687HHuTg",
            "tracks": {
                "href": "https://api.spotify.com/v1/playlists/08dWJ0fEK7gFz5nN3aFlnt/tracks",
                "total": 69
            },
            "type": "playlist",
            "uri": "spotify:playlist:08dWJ0fEK7gFz5nN3aFlnt"
        },
        {
            "collaborative": false,
            "description": "",
            "external_urls": {
                "spotify": "https://open.spotify.com/playlist/2YqTeUwvYLznnKdC3ah2sd"
            },
            "href": "https://api.spotify.com/v1/playlists/2YqTeUwvYLznnKdC3ah2sd",
            "id": "2YqTeUwvYLznnKdC3ah2sd",
            "images": [
                {
                    "height": 640,
                    "url": "https://mosaic.scdn.co/640/ab67616d00001e02042b5cc9a1a0a97cfc005ee8ab67616d00001e02537de4a19f2352747a36172eab67616d00001e025c7336d25ca101fbb0855647ab67616d00001e025f3aef5159749e4b61686670",
                    "width": 640
                },
                {
                    "height": 300,
                    "url": "https://mosaic.scdn.co/300/ab67616d00001e02042b5cc9a1a0a97cfc005ee8ab67616d00001e02537de4a19f2352747a36172eab67616d00001e025c7336d25ca101fbb0855647ab67616d00001e025f3aef5159749e4b61686670",
                    "width": 300
                },
                {
                    "height": 60,
                    "url": "https://mosaic.scdn.co/60/ab67616d00001e02042b5cc9a1a0a97cfc005ee8ab67616d00001e02537de4a19f2352747a36172eab67616d00001e025c7336d25ca101fbb0855647ab67616d00001e025f3aef5159749e4b61686670",
                    "width": 60
                }
            ],
            "name": "Corridos",
            "owner": {
                "display_name": "Roman",
                "external_urls": {
                    "spotify": "https://open.spotify.com/user/kka1knztq7aigfnz8uao26vqq"
                },
                "href": "https://api.spotify.com/v1/users/kka1knztq7aigfnz8uao26vqq",
                "id": "kka1knztq7aigfnz8uao26vqq",
                "type": "user",
                "uri": "spotify:user:kka1knztq7aigfnz8uao26vqq"
            },
            "primary_color": null,
            "public": true,
            "snapshot_id": "AAAAEoyZFZdofjTh4Z8+c6NdGDQ4i+Rf",
            "tracks": {
                "href": "https://api.spotify.com/v1/playlists/2YqTeUwvYLznnKdC3ah2sd/tracks",
                "total": 17
            },
            "type": "playlist",
            "uri": "spotify:playlist:2YqTeUwvYLznnKdC3ah2sd"
        },
        {
            "collaborative": false,
            "description": "",
            "external_urls": {
                "spotify": "https://open.spotify.com/playlist/60btAwJb8JRytOvDJnsrZ5"
            },
            "href": "https://api.spotify.com/v1/playlists/60btAwJb8JRytOvDJnsrZ5",
            "id": "60btAwJb8JRytOvDJnsrZ5",
            "images": null,
            "name": "Los me gusta",
            "owner": {
                "display_name": "Roman",
                "external_urls": {
                    "spotify": "https://open.spotify.com/user/kka1knztq7aigfnz8uao26vqq"
                },
                "href": "https://api.spotify.com/v1/users/kka1knztq7aigfnz8uao26vqq",
                "id": "kka1knztq7aigfnz8uao26vqq",
                "type": "user",
                "uri": "spotify:user:kka1knztq7aigfnz8uao26vqq"
            },
            "primary_color": null,
            "public": true,
            "snapshot_id": "AAAAAu3eGlhDQ0J13Yn1xUMJWy/mWGJx",
            "tracks": {
                "href": "https://api.spotify.com/v1/playlists/60btAwJb8JRytOvDJnsrZ5/tracks",
                "total": 0
            },
            "type": "playlist",
            "uri": "spotify:playlist:60btAwJb8JRytOvDJnsrZ5"
        },
        {
            "collaborative": false,
            "description": "",
            "external_urls": {
                "spotify": "https://open.spotify.com/playlist/2ZELetwIfkDAMYJOuu6cBb"
            },
            "href": "https://api.spotify.com/v1/playlists/2ZELetwIfkDAMYJOuu6cBb",
            "id": "2ZELetwIfkDAMYJOuu6cBb",
            "images": [
                {
                    "height": null,
                    "url": "https://i.scdn.co/image/ab67616d00001e02ee9e89e3fa7617372c2c7540",
                    "width": null
                }
            ],
            "name": "Folklore",
            "owner": {
                "display_name": "Roman",
                "external_urls": {
                    "spotify": "https://open.spotify.com/user/kka1knztq7aigfnz8uao26vqq"
                },
                "href": "https://api.spotify.com/v1/users/kka1knztq7aigfnz8uao26vqq",
                "id": "kka1knztq7aigfnz8uao26vqq",
                "type": "user",
                "uri": "spotify:user:kka1knztq7aigfnz8uao26vqq"
            },
            "primary_color": null,
            "public": true,
            "snapshot_id": "AAAABOn3uaqvFrZXQtK/WpJK3RnSo7Dc",
            "tracks": {
                "href": "https://api.spotify.com/v1/playlists/2ZELetwIfkDAMYJOuu6cBb/tracks",
                "total": 2
            },
            "type": "playlist",
            "uri": "spotify:playlist:2ZELetwIfkDAMYJOuu6cBb"
        },
        {
            "collaborative": false,
            "description": "",
            "external_urls": {
                "spotify": "https://open.spotify.com/playlist/3dYNeeEad37tAfbijjAC4u"
            },
            "href": "https://api.spotify.com/v1/playlists/3dYNeeEad37tAfbijjAC4u",
            "id": "3dYNeeEad37tAfbijjAC4u",
            "images": [
                {
                    "height": 640,
                    "url": "https://mosaic.scdn.co/640/ab67616d00001e02211bcd4f50464c15d7c7f111ab67616d00001e028c5e26c45a7703cf16f509f7ab67616d00001e029d37d1aba5ae9b00ade41865ab67616d00001e02de5f51296e162e8ec5d56899",
                    "width": 640
                },
                {
                    "height": 300,
                    "url": "https://mosaic.scdn.co/300/ab67616d00001e02211bcd4f50464c15d7c7f111ab67616d00001e028c5e26c45a7703cf16f509f7ab67616d00001e029d37d1aba5ae9b00ade41865ab67616d00001e02de5f51296e162e8ec5d56899",
                    "width": 300
                },
                {
                    "height": 60,
                    "url": "https://mosaic.scdn.co/60/ab67616d00001e02211bcd4f50464c15d7c7f111ab67616d00001e028c5e26c45a7703cf16f509f7ab67616d00001e029d37d1aba5ae9b00ade41865ab67616d00001e02de5f51296e162e8ec5d56899",
                    "width": 60
                }
            ],
            "name": "Tiesto",
            "owner": {
                "display_name": "Roman",
                "external_urls": {
                    "spotify": "https://open.spotify.com/user/kka1knztq7aigfnz8uao26vqq"
                },
                "href": "https://api.spotify.com/v1/users/kka1knztq7aigfnz8uao26vqq",
                "id": "kka1knztq7aigfnz8uao26vqq",
                "type": "user",
                "uri": "spotify:user:kka1knztq7aigfnz8uao26vqq"
            },
            "primary_color": null,
            "public": true,
            "snapshot_id": "AAAACUMte8Rj4DBr3nkNLa/+Ro0kahke",
            "tracks": {
                "href": "https://api.spotify.com/v1/playlists/3dYNeeEad37tAfbijjAC4u/tracks",
                "total": 8
            },
            "type": "playlist",
            "uri": "spotify:playlist:3dYNeeEad37tAfbijjAC4u"
        },
        {
            "collaborative": false,
            "description": "",
            "external_urls": {
                "spotify": "https://open.spotify.com/playlist/1rzWyTYV8bvToLyHXubRh1"
            },
            "href": "https://api.spotify.com/v1/playlists/1rzWyTYV8bvToLyHXubRh1",
            "id": "1rzWyTYV8bvToLyHXubRh1",
            "images": [
                {
                    "height": 640,
                    "url": "https://mosaic.scdn.co/640/ab67616d00001e0264f8a309aa3c0a66a31fc374ab67616d00001e0272c57da7edfe8e915182cdd4ab67616d00001e028c77bcf5f5a227d270d23370ab67616d00001e02b800b91af812df0ce0dd2883",
                    "width": 640
                },
                {
                    "height": 300,
                    "url": "https://mosaic.scdn.co/300/ab67616d00001e0264f8a309aa3c0a66a31fc374ab67616d00001e0272c57da7edfe8e915182cdd4ab67616d00001e028c77bcf5f5a227d270d23370ab67616d00001e02b800b91af812df0ce0dd2883",
                    "width": 300
                },
                {
                    "height": 60,
                    "url": "https://mosaic.scdn.co/60/ab67616d00001e0264f8a309aa3c0a66a31fc374ab67616d00001e0272c57da7edfe8e915182cdd4ab67616d00001e028c77bcf5f5a227d270d23370ab67616d00001e02b800b91af812df0ce0dd2883",
                    "width": 60
                }
            ],
            "name": "Martin Garrix",
            "owner": {
                "display_name": "Roman",
                "external_urls": {
                    "spotify": "https://open.spotify.com/user/kka1knztq7aigfnz8uao26vqq"
                },
                "href": "https://api.spotify.com/v1/users/kka1knztq7aigfnz8uao26vqq",
                "id": "kka1knztq7aigfnz8uao26vqq",
                "type": "user",
                "uri": "spotify:user:kka1knztq7aigfnz8uao26vqq"
            },
            "primary_color": null,
            "public": true,
            "snapshot_id": "AAAAIrSGjIiLSCatOwd+4L4mdiye8Jet",
            "tracks": {
                "href": "https://api.spotify.com/v1/playlists/1rzWyTYV8bvToLyHXubRh1/tracks",
                "total": 31
            },
            "type": "playlist",
            "uri": "spotify:playlist:1rzWyTYV8bvToLyHXubRh1"
        },
        {
            "collaborative": false,
            "description": "Estoy enamorado",
            "external_urls": {
                "spotify": "https://open.spotify.com/playlist/2Nt8TWGs7twJQRhqWKYmes"
            },
            "href": "https://api.spotify.com/v1/playlists/2Nt8TWGs7twJQRhqWKYmes",
            "id": "2Nt8TWGs7twJQRhqWKYmes",
            "images": [
                {
                    "height": 640,
                    "url": "https://mosaic.scdn.co/640/ab67616d00001e024adbeb26299adca766cec2c5ab67616d00001e0250a3147b4edd7701a876c6ceab67616d00001e028a3f0a3ca7929dea23cd274cab67616d00001e02a9f6c04ba168640b48aa5795",
                    "width": 640
                },
                {
                    "height": 300,
                    "url": "https://mosaic.scdn.co/300/ab67616d00001e024adbeb26299adca766cec2c5ab67616d00001e0250a3147b4edd7701a876c6ceab67616d00001e028a3f0a3ca7929dea23cd274cab67616d00001e02a9f6c04ba168640b48aa5795",
                    "width": 300
                },
                {
                    "height": 60,
                    "url": "https://mosaic.scdn.co/60/ab67616d00001e024adbeb26299adca766cec2c5ab67616d00001e0250a3147b4edd7701a876c6ceab67616d00001e028a3f0a3ca7929dea23cd274cab67616d00001e02a9f6c04ba168640b48aa5795",
                    "width": 60
                }
            ],
            "name": "Billie Eilish",
            "owner": {
                "display_name": "Roman",
                "external_urls": {
                    "spotify": "https://open.spotify.com/user/kka1knztq7aigfnz8uao26vqq"
                },
                "href": "https://api.spotify.com/v1/users/kka1knztq7aigfnz8uao26vqq",
                "id": "kka1knztq7aigfnz8uao26vqq",
                "type": "user",
                "uri": "spotify:user:kka1knztq7aigfnz8uao26vqq"
            },
            "primary_color": null,
            "public": true,
            "snapshot_id": "AAAALme7VYomXYD0S7VbMSfFxOjvtgud",
            "tracks": {
                "href": "https://api.spotify.com/v1/playlists/2Nt8TWGs7twJQRhqWKYmes/tracks",
                "total": 32
            },
            "type": "playlist",
            "uri": "spotify:playlist:2Nt8TWGs7twJQRhqWKYmes"
        },
        {
            "collaborative": false,
            "description": "Amo la musica elecctronica.",
            "external_urls": {
                "spotify": "https://open.spotify.com/playlist/19tE3SkkxyFrh5GxY6x9Tp"
            },
            "href": "https://api.spotify.com/v1/playlists/19tE3SkkxyFrh5GxY6x9Tp",
            "id": "19tE3SkkxyFrh5GxY6x9Tp",
            "images": [
                {
                    "height": 640,
                    "url": "https://mosaic.scdn.co/640/ab67616d00001e0264f8a309aa3c0a66a31fc374ab67616d00001e026abad6915a2216dc18e7e3a7ab67616d00001e02a108e07c661f9fc54de9c43aab67616d00001e02d0d90d516468655298b85062",
                    "width": 640
                },
                {
                    "height": 300,
                    "url": "https://mosaic.scdn.co/300/ab67616d00001e0264f8a309aa3c0a66a31fc374ab67616d00001e026abad6915a2216dc18e7e3a7ab67616d00001e02a108e07c661f9fc54de9c43aab67616d00001e02d0d90d516468655298b85062",
                    "width": 300
                },
                {
                    "height": 60,
                    "url": "https://mosaic.scdn.co/60/ab67616d00001e0264f8a309aa3c0a66a31fc374ab67616d00001e026abad6915a2216dc18e7e3a7ab67616d00001e02a108e07c661f9fc54de9c43aab67616d00001e02d0d90d516468655298b85062",
                    "width": 60
                }
            ],
            "name": "Electronic",
            "owner": {
                "display_name": "Roman",
                "external_urls": {
                    "spotify": "https://open.spotify.com/user/kka1knztq7aigfnz8uao26vqq"
                },
                "href": "https://api.spotify.com/v1/users/kka1knztq7aigfnz8uao26vqq",
                "id": "kka1knztq7aigfnz8uao26vqq",
                "type": "user",
                "uri": "spotify:user:kka1knztq7aigfnz8uao26vqq"
            },
            "primary_color": null,
            "public": true,
            "snapshot_id": "AAAAFauFUPQpNBV8l3pCvJJOILszJZIR",
            "tracks": {
                "href": "https://api.spotify.com/v1/playlists/19tE3SkkxyFrh5GxY6x9Tp/tracks",
                "total": 19
            },
            "type": "playlist",
            "uri": "spotify:playlist:19tE3SkkxyFrh5GxY6x9Tp"
        }
    ]
}

/*showPlayLists();*/
showPlayLists()
async function showPlayLists() {
    /*const playlists = await getPlayListsUser();*/
    const playlists = datosia;
    console.log(playlists);

    const playListsGrid = document.getElementById('slot-card-playlist-library');

    if (playlists?.items != null) {

    }
    playlists?.items?.forEach(function (item) {
        console.log(item)
        const playList = document.createElement('button');
        /*playList.onclick = showTracksPlayList(item.id);*/
        /*playList.setAttribute("onclick",`showTracksPlayList('${item.id}')`);*/
        playList.classList.add('card-playlist');
        playList.classList.add('pointer');
        playList.addEventListener('click', () => {
            showTracksPlayList(item.id)
        });
        /*playList.classList.add('card');*/

        let imagenUrl = ""
        if (item.images != null) {
            imagenUrl = item?.images[0]?.url;
        } else {
            imagenUrl = imgLike;
        }
        playList.innerHTML = `
        <div class="play-list">
            <i class="fa-solid fa-play"></i>
        </div>
        <div class="playlist-presentations">
            <img src="${imagenUrl}" alt="as"/>
        </div>
        <div class="titles">
            <div class="playlist-name">
                <span>${item.name}</span>
            </div>
            <div class="playlist-description">

                <span>${item.type}</span>-
                <span>${item.owner.display_name}</span>
            </div>
        </div>
        `;

        playListsGrid.appendChild(playList);
    });
}

async function getCategoriesUser() {
    const Categories = await fetchWebApi(
        `v1/browse/categories`,
        'GET'
    );

    return Categories;
}
const catia = {
    "categories": {
        "href": "https://api.spotify.com/v1/browse/categories?offset=0&limit=20&locale=es-419,es;q%3D0.9,en;q%3D0.8",
        "items": [
            {
                "href": "https://api.spotify.com/v1/browse/categories/0JQ5DAt0tbjZptfcdMSKl3",
                "id": "0JQ5DAt0tbjZptfcdMSKl3",
                "icons": [
                    {
                        "height": 274,
                        "url": "https://t.scdn.co/images/728ed47fc1674feb95f7ac20236eb6d7.jpeg",
                        "width": 274
                    }
                ],
                "name": "Creado para ti"
            },
            {
                "href": "https://api.spotify.com/v1/browse/categories/0JQ5DAqbMKFz6FAsUtgAab",
                "id": "0JQ5DAqbMKFz6FAsUtgAab",
                "icons": [
                    {
                        "height": 274,
                        "url": "https://t.scdn.co/images/728ed47fc1674feb95f7ac20236eb6d7.jpeg",
                        "width": 274
                    }
                ],
                "name": "Nuevos lanzamientos"
            },
            {
                "href": "https://api.spotify.com/v1/browse/categories/0JQ5DAqbMKFxXaXKP7zcDp",
                "id": "0JQ5DAqbMKFxXaXKP7zcDp",
                "icons": [
                    {
                        "height": 274,
                        "url": "https://t.scdn.co/media/derived/latin-274x274_befbbd1fbb8e045491576e317cb16cdf_0_0_274_274.jpg",
                        "width": 274
                    }
                ],
                "name": "Latina"
            },
            {
                "href": "https://api.spotify.com/v1/browse/categories/0JQ5DAqbMKFEC4WFtoNRpw",
                "id": "0JQ5DAqbMKFEC4WFtoNRpw",
                "icons": [
                    {
                        "height": 274,
                        "url": "https://t.scdn.co/media/derived/pop-274x274_447148649685019f5e2a03a39e78ba52_0_0_274_274.jpg",
                        "width": 274
                    }
                ],
                "name": "Pop"
            },
            {
                "href": "https://api.spotify.com/v1/browse/categories/0JQ5DAqbMKFQIL0AXnG5AK",
                "id": "0JQ5DAqbMKFQIL0AXnG5AK",
                "icons": [
                    {
                        "height": 274,
                        "url": "https://t.scdn.co/images/ac75ec857b714a118c73218bb58664e5.jpeg",
                        "width": 274
                    }
                ],
                "name": "Tendencias"
            },
            {
                "href": "https://api.spotify.com/v1/browse/categories/0JQ5DAqbMKFR9D66iFXqzk",
                "id": "0JQ5DAqbMKFR9D66iFXqzk",
                "icons": [
                    {
                        "height": 274,
                        "url": "https://t.scdn.co/images/cb9d28c9b084483caf81ef9c4a6420af.jpeg",
                        "width": 274
                    }
                ],
                "name": "Cumbia"
            },
            {
                "href": "https://api.spotify.com/v1/browse/categories/0JQ5DAudkNjCgYMM0TZXDw",
                "id": "0JQ5DAudkNjCgYMM0TZXDw",
                "icons": [
                    {
                        "height": 274,
                        "url": "https://charts-images.scdn.co/spotify-charts-logos/music_charts_search_arrow_274x274.jpeg",
                        "width": 274
                    }
                ],
                "name": "Rankings"
            },
            {
                "href": "https://api.spotify.com/v1/browse/categories/0JQ5DAqbMKFHOzuVTgTizF",
                "id": "0JQ5DAqbMKFHOzuVTgTizF",
                "icons": [
                    {
                        "height": 274,
                        "url": "https://t.scdn.co/media/derived/edm-274x274_0ef612604200a9c14995432994455a6d_0_0_274_274.jpg",
                        "width": 274
                    }
                ],
                "name": "Dance/Electrónica"
            },
            {
                "href": "https://api.spotify.com/v1/browse/categories/0JQ5DAqbMKFzHmL4tf05da",
                "id": "0JQ5DAqbMKFzHmL4tf05da",
                "icons": [
                    {
                        "height": 274,
                        "url": "https://t.scdn.co/media/original/mood-274x274_976986a31ac8c49794cbdc7246fd5ad7_274x274.jpg",
                        "width": 274
                    }
                ],
                "name": "Estado de ánimo"
            },
            {
                "href": "https://api.spotify.com/v1/browse/categories/0JQ5DAqbMKFCWjUTdzaG0e",
                "id": "0JQ5DAqbMKFCWjUTdzaG0e",
                "icons": [
                    {
                        "height": 274,
                        "url": "https://t.scdn.co/images/fe06caf056474bc58862591cd60b57fc.jpeg",
                        "width": 274
                    }
                ],
                "name": "Indie"
            },
            {
                "href": "https://api.spotify.com/v1/browse/categories/0JQ5DAqbMKFAXlCG6QvYQ4",
                "id": "0JQ5DAqbMKFAXlCG6QvYQ4",
                "icons": [
                    {
                        "height": 274,
                        "url": "https://t.scdn.co/media/links/workout-274x274.png",
                        "width": 274
                    }
                ],
                "name": "Entrenamiento"
            },
            {
                "href": "https://api.spotify.com/v1/browse/categories/0JQ5DAtOnAEpjOgUKwXyxj",
                "id": "0JQ5DAtOnAEpjOgUKwXyxj",
                "icons": [
                    {
                        "height": 274,
                        "url": "https://t.scdn.co/images/728ed47fc1674feb95f7ac20236eb6d7.jpeg",
                        "width": 274
                    }
                ],
                "name": "Descubre"
            },
            {
                "href": "https://api.spotify.com/v1/browse/categories/0JQ5DAqbMKFQkIFo7vWoOd",
                "id": "0JQ5DAqbMKFQkIFo7vWoOd",
                "icons": [
                    {
                        "height": 274,
                        "url": "https://t.scdn.co/images/33faf792539648da945e9286a1e91492",
                        "width": 274
                    }
                ],
                "name": "Salsa"
            },
            {
                "href": "https://api.spotify.com/v1/browse/categories/0JQ5DAqbMKFEZPnFQSFB1T",
                "id": "0JQ5DAqbMKFEZPnFQSFB1T",
                "icons": [
                    {
                        "height": 274,
                        "url": "https://t.scdn.co/media/derived/r-b-274x274_fd56efa72f4f63764b011b68121581d8_0_0_274_274.jpg",
                        "width": 274
                    }
                ],
                "name": "Rhythm & Blues"
            },
            {
                "href": "https://api.spotify.com/v1/browse/categories/0JQ5DAqbMKFGvOw3O4nLAf",
                "id": "0JQ5DAqbMKFGvOw3O4nLAf",
                "icons": [
                    {
                        "height": 274,
                        "url": "https://t.scdn.co/images/2078afd91e4d431eb19efc5bee5ab131.jpeg",
                        "width": 274
                    }
                ],
                "name": "Pop coreano"
            },
            {
                "href": "https://api.spotify.com/v1/browse/categories/0JQ5DAqbMKFFzDl7qN9Apr",
                "id": "0JQ5DAqbMKFFzDl7qN9Apr",
                "icons": [
                    {
                        "height": 274,
                        "url": "https://t.scdn.co/media/derived/chill-274x274_4c46374f007813dd10b37e8d8fd35b4b_0_0_274_274.jpg",
                        "width": 274
                    }
                ],
                "name": "Para relajarse"
            },
            {
                "href": "https://api.spotify.com/v1/browse/categories/0JQ5DAqbMKFCuoRTxhYWow",
                "id": "0JQ5DAqbMKFCuoRTxhYWow",
                "icons": [
                    {
                        "height": 274,
                        "url": "https://t.scdn.co/media/derived/sleep-274x274_0d4f836af8fab7bf31526968073e671c_0_0_274_274.jpg",
                        "width": 274
                    }
                ],
                "name": "Dormir"
            },
            {
                "href": "https://api.spotify.com/v1/browse/categories/0JQ5DAqbMKFA6SOHvT3gck",
                "id": "0JQ5DAqbMKFA6SOHvT3gck",
                "icons": [
                    {
                        "height": 274,
                        "url": "https://t.scdn.co/images/7ee6530d5b3c4acc9a0957046bf11d63",
                        "width": 274
                    }
                ],
                "name": "Fiesta"
            },
            {
                "href": "https://api.spotify.com/v1/browse/categories/0JQ5DAqbMKFx0uLQR2okcc",
                "id": "0JQ5DAqbMKFx0uLQR2okcc",
                "icons": [
                    {
                        "height": 274,
                        "url": "https://t.scdn.co/images/04da469dd7be4dab96659aa1fa9f0ac9.jpeg",
                        "width": 274
                    }
                ],
                "name": "En casa"
            },
            {
                "href": "https://api.spotify.com/v1/browse/categories/0JQ5DAqbMKFIVNxQgRNSg0",
                "id": "0JQ5DAqbMKFIVNxQgRNSg0",
                "icons": [
                    {
                        "height": 274,
                        "url": "https://t.scdn.co/images/04111a3b810243288d81a539ba03f8d0",
                        "width": 274
                    }
                ],
                "name": "Décadas"
            }
        ],
        "limit": 20,
        "next": "https://api.spotify.com/v1/browse/categories?offset=20&limit=20&locale=es-419,es;q%3D0.9,en;q%3D0.8",
        "offset": 0,
        "previous": null,
        "total": 54
    }
};
/*showCategories();*/

async function showCategories() {
    const categories = await getCategoriesUser();
    /*const categories = catia;*/
    console.log(categories);
    const slotSectiopnCategories = document.getElementById('slot-categories-user');

    if (categories?.items != null) {

    }
    categories?.categories?.items?.forEach(function (item) {
        console.log(item)

        const sectionEspecCat = document.createElement('div');
        /*sectionEspecCat.onclick = showTracksPlayList(item.id);*/
        /*sectionEspecCat.setAttribute("onclick",`showTracksPlayList('${item.id}')`);*/
        sectionEspecCat.classList.add('cards-container');
        sectionEspecCat.addEventListener('click', () => {
            showTracksPlayList(item.id)
        });
        /*sectionEspecCat.classList.add('card');*/

        let imagenUrl = ""
        if (item?.images != null) {
            imagenUrl = item?.images[0]?.url;
        } else {
            imagenUrl = imgLike;
        }
        sectionEspecCat.innerHTML = `
        <div class="card pointer">
            <div class="play">
                <i class="fa-solid fa-play"></i>
            </div>
            <img class="card-img" src="${item.icons[0].url}" alt="card image">
            <p class="card-title">${item.name}</p>
            <!--<p class="card-info">The Weeknd</p>-->
        </div>
        `;

        slotSectiopnCategories.appendChild(sectionEspecCat);
    });
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

    showPlayLists();
    showCategories();
}

// De lo contrario, no iniciaremos sesión, por lo que renderizaremos la plantilla de inicio de sesión.
// Si NO tenemos un token, si NO estamos logeados, entonces mostrar pagina de login
if (!currentToken.access_token) {
    renderTemplate("slot-user-img", "login");
}
//#endregion

/*

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
}*/
