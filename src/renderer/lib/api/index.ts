import type RendererAPI from "./setup";

export type WindowWithAPI = {
  API: typeof RendererAPI;
};

// Use a Proxy so window.API is accessed lazily at call time rather than at
// module evaluation time. This matters for the web app where window.API is
// set by installWebRendererApi() after modules have already been loaded.
const API = new Proxy({} as typeof RendererAPI, {
  get(_target, prop: string) {
    return (window as unknown as WindowWithAPI).API[
      prop as keyof typeof RendererAPI
    ];
  },
});

export default API;
