require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const { getLyricsFromGenius } = require('scrapelyrics');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // Token del bot de Telegram
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // Chat ID de mi conversacion con el bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  console.log(`Message received from chat ID ${chatId}: ${text}`);
});


const app = express();
const port = process.env.PORT || 3000; 

var songtitle = "";
var songartist = "";
var songlyrics = "";
var songdata = "";
var songImageUrl = "";
var albumImageUrl = "";
var albumName = "";
var releaseDate = "";
var genres = "";
var geniusUrl = "";
var description = "";

app.use(bodyParser.json());
// Habilitar CORS para poder hacer peticiones desde el cliente
app.use(cors()); 

app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
}); 

app.get('/api/genius/lyrics', async (req, res) => {
    const accessToken = process.env.GENIUS_ACCESS_TOKEN; 
    const songTitle = req.query.q || "Metallica Whiplash";
    
    if (!songTitle) {
      return res.status(400).send('El título de la canción es requerido');
    }
  
    try {
      
      const searchResponse = await axios.get('https://api.genius.com/search', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        params: {
          q: songTitle
        }
      });
      // Validar que se haya encontrado la canción
      if (searchResponse.data.response.hits.length === 0) {
        return res.status(404).send('Canción no encontrada');
      }
      // Obtener el ID de la canción
      const songId = searchResponse.data.response.hits[0].result.id;
      console.log('ID de la canción:', songId);
      // Obtener los datos de la canción
      const GetSongData = await axios.get(`https://api.genius.com/songs/${songId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      console.log("Titulo: " + GetSongData.data.response.song.title + " Artista: " + GetSongData.data.response.song.primary_artist.name);
      console.log(GetSongData.data);
      songtitle = GetSongData.data.response.song.title;
      songartist = GetSongData.data.response.song.primary_artist.name;
      songdata = GetSongData.data.response.song;
      songImageUrl = songdata.song_art_image_url;
      albumImageUrl = songdata.header_image_url;
      albumName = songdata.album.name;
      releaseDate = songdata.release_date;
      genres = songdata.geniusUrl;
      description = songdata.description;
      geniusUrl = songdata.url;
      console.log("URL de la imagen de la cancion: " + songImageUrl);
      // Obtener la letra de la canción usando la API de Genius Lyrics API
     

      // Obtener la letra de la canción
      songlyrics = await getLyricsFromGenius(geniusUrl);

      
      console.log('Letra de la canción:', songlyrics);
      // Enviar la letra de la canción como respuesta
      // Y enviar los datos de la canción

      // Obtener el video de youtube de la cancion URL a partir de el titulo obtenido y el artista

      async function searchYouTube(query) {
        const apiKey = process.env.YOUTUBE_API_KEY;
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&key=${apiKey}`;
    
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Error en la solicitud a la API de YouTube');
            }
            const data = await response.json();
            console.log('Resultados de la búsqueda:', data);
  
            // Obtener la URL del primer video
            if (data.items && data.items.length > 0) {
                const firstVideoId = data.items[0].id.videoId;
                const firstVideoUrl = `https://www.youtube.com/watch?v=${firstVideoId}`;
                const embedUrl = `https://www.youtube.com/embed/${firstVideoId}`;
                const message = 'Youtube API request successful';
                return { firstVideoUrl, embedUrl, message: message };
            } else {
                return { firstVideoUrl: null, embedUrl: null, message: 'La cuota máxima de la API de YouTube se ha alcanzado.' };
            }
        } catch (error) {
            console.error('Error al realizar la búsqueda en YouTube:', error);
            return { firstVideoUrl: null, embedUrl: null, message: 'La cuota máxima de la API de YouTube se ha alcanzado.' };
        }
    }
    var query = songtitle + " " + songartist;
    const { firstVideoUrl, embedUrl, message } = await searchYouTube(query);

    

    // construir el JSON 
      const songData = {
        title: songtitle,
        artist: songartist,
        lyrics: songlyrics,
        imageUrl: songImageUrl,
        albumImageUrl: albumImageUrl,
        albumName: albumName,
        releaseDate: releaseDate,
        genres: genres,
        geniusUrl: geniusUrl,
        description: description,
        VideoUrl: firstVideoUrl,
        EmbedUrl: embedUrl,
        APIauthor: "Eduard Fernandez",
        youtubeMessage: message
      };
      // Enviar la respuesta con todos los datos en formato JSON
      res.json(songData);
      
    } catch (error) {
      console.error(error);
      res.status(500).send('Error al obtener la letra de la canción de Genius');
    }
});

app.post('/genius/notify', (req, res) => {
  const notificationData = req.body;

  // Agregar la notificación al array
  notifications.push(notificationData);

  // Enviar notificación al bot de Telegram
  const message = `New notification:\nSong: ${notificationData.song}\nDate and hour: ${notificationData.timestamp} \nYoutube message (status): ${notificationData.notificationmessage}`;
  
  bot.sendMessage(TELEGRAM_CHAT_ID, message)
    .then(() => {
      console.log('Notificación enviada al bot de Telegram');
    })
    .catch((error) => {
      console.error('Error al enviar la notificación al bot de Telegram:', error);
    });

  // Procesar la notificación 
  console.log('Notificación recibida:', notificationData);

  // Responder con un mensaje de confirmación
  res.status(200).send('Notificación recibida correctamente');
});
    // Endpoint para obtener las notificaciones registradas
app.get('/genius/notifications', (req, res) => {
  res.json(notifications);

  
});

