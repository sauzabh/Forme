"use client";

import { useGLTF } from "@react-three/drei";

/**
 * Models are Draco-compressed (several times smaller). The decoder is
 * self-hosted in public/draco/ — copied from the three.js package — so the
 * app never depends on a third-party server to show a figure.
 */
const DRACO_DECODER_PATH = "/draco/";

export function useModel(url: string) {
  return useGLTF(url, DRACO_DECODER_PATH);
}

export function preloadModel(url: string) {
  useGLTF.preload(url, DRACO_DECODER_PATH);
}
