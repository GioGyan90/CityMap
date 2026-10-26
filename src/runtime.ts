// A single critical-path module lets Vite preload its dependencies together.
// Keep side effects ordered: ground, city, lighting, then interaction.
import './environment';
import './city';
import './night';
import './focus';
import './labels';
import './camera';
