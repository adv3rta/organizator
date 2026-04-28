import axios from "axios";
import { getEnv } from "./env";

export const createHttpClient = () =>
  axios.create({
    baseURL: getEnv().apiBaseUrl,
    timeout: 8000
  });
