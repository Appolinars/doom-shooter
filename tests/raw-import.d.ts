// Vite `?raw` imports (used by the effects.test.ts AC-T06-1 static source check).
declare module '*?raw' {
  const content: string;
  export default content;
}
