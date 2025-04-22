import { createPlayer, forwardKeydownEvent } from '../src';

const getShowName = (): HTMLElement => document.getElementById('show')!;
const getEpisodeName = (): HTMLElement => document.getElementById('episode')!;
const getSeason = (): HTMLElement => document.getElementById('season')!;
const getNumber = (): HTMLElement => document.getElementById('number')!;
const getAbsoluteNumber = (): HTMLElement =>
  document.getElementById('absolute-number')!;

// Forward the custom keydown event consumed by the player
window.addEventListener('keydown', (event) => {
  const activeTag = document.activeElement?.tagName;
  if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

  forwardKeydownEvent(event);
});

// Set the episode info from env
if (process.env.VITE_SHOW_NAME)
  getShowName().textContent = process.env.VITE_SHOW_NAME;
if (process.env.VITE_EPISODE_NAME)
  getEpisodeName().textContent = process.env.VITE_EPISODE_NAME;
if (process.env.VITE_SEASON) getSeason().textContent = process.env.VITE_SEASON;
if (process.env.VITE_NUMBER) getNumber().textContent = process.env.VITE_NUMBER;
if (process.env.VITE_ABSOLUTE_NUMBER)
  getAbsoluteNumber().textContent = process.env.VITE_ABSOLUTE_NUMBER;

// Set a custom video for development from a .env file
const videoUrl =
  process.env.VITE_VIDEO_SRC ||
  'https://archive.org/download/big-bunny-sample-video/SampleVideo.mp4';
document.querySelector('video')!.src = videoUrl;

// Load and mount the player
const player = createPlayer({
  serviceName: 'Development',
  getEpisodeInfo() {
    return {
      showName: getShowName().textContent,
      episodeName: getEpisodeName().textContent,
      season: getSeason().textContent,
      number: getNumber().textContent,
      absoluteNumber: getAbsoluteNumber().textContent,
    };
  },
  fullscreenElement: '.video-container',
  apiUrl: process.env.VITE_API_URL,
});
player.mount('.video-container');
