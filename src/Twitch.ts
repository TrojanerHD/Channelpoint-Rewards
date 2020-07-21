import * as WebSocket from 'ws';
import OBS from './obs/OBS';
import TwitchServer from './TwitchServer';
import fetch from 'node-fetch';

export default class Twitch {
  private _ws: WebSocket;
  private _obs: OBS = new OBS();
  _accessToken: string;

  constructor() {
    this._obs.ensureConnection(this._obs.removeFilters.bind(this._obs));
    if (!process.env.REFRESH_TOKEN) {
      console.log(
        'Please head to http://localhost:4271/ and authorize the application'
      );
      new TwitchServer(this);
      return;
    }
    this.startWebSocketServer();
  }

  startWebSocketServer(): void {
    this._ws = new WebSocket('wss://pubsub-edge.twitch.tv');
    this._ws.on('open', this.onOpen.bind(this));
    this._ws.on('message', this.onMessage.bind(this));
  }

  private onOpen(): void {
    if (!this._accessToken) this.refreshAccessToken();
    else this.initListener();
  }

  private refreshAccessToken(): void {
    fetch(
      `https://id.twitch.tv/oauth2/token?grant_type=refresh_token&refresh_token=${process.env.REFRESH_TOKEN}&client_id=${process.env.TWITCH_ID}&client_secret=${process.env.TWITCH_SECRET}`,
      { method: 'POST' }
    )
      .then(TwitchServer.responseToJson)
      .then(
        (body: {
          access_token: string;
          refresh_token: string;
          scope: string;
        }) => {
          this._accessToken = body.access_token;
          this.initListener();
        }
      );
  }

  private initListener(): void {
    const message: {
      type: string;
      nonce: string;
      data: { topics: string[]; auth_token: string };
    } = {
      type: 'LISTEN',
      nonce: this.nonce(15),
      data: {
        topics: ['channel-points-channel-v1.154278223'],
        auth_token: this._accessToken,
      },
    };
    this._ws.send(JSON.stringify(message));
    setInterval(() => this._ws.send(JSON.stringify({ type: 'PING' })), 240000);
  }

  private onMessage(event: string) {
    const message: {
      data?: { topic: string; message: string };
      type: string;
      error?: string;
      nonce: string;
    } = JSON.parse(event);
    if (!('data' in message)) {
      if (message.type !== 'PONG' || message.error !== '') console.log(message);
      return;
    }
    const title: string = JSON.parse(message.data.message).data.redemption
      .reward.title;
    switch (title) {
      case 'Oversaturated':
        this._obs.ensureConnection(this._obs.addFilters.bind(this._obs));
    }
  }

  // Source: https://www.thepolyglotdeveloper.com/2015/03/create-a-random-nonce-string-using-javascript/
  private nonce(length: number) {
    let text: string = '';
    const possible: string =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
  }
}
