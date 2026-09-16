/* Vite rewrites these to a built asset URL. The project's tsconfig does not pull in
   vite/client (it is on bun's types), so the two shapes we actually use are declared
   here rather than dragging the whole ambient set in. */
declare module "*.mp3?url" {
  const url: string;
  export default url;
}
declare module "*.wav?url" {
  const url: string;
  export default url;
}
