import * as OBSWebSocket from 'obs-websocket-js';
import FilterRemover from './FilterRemover';

export default class OBS {
  static _obs: OBSWebSocket;
  private readonly _sourceNames: string[] = [
    'Display Capture',
    'Game',
    'Video Capture Device',
  ];
  private _existingFilters: string[] = [];
  private _timeoutEndDate: Date = new Date();
  private _timeout: NodeJS.Timeout;

  addFilters(): void {
    if (this._timeoutEndDate < new Date()) this._timeoutEndDate = new Date();
    this._timeoutEndDate.setMinutes(this._timeoutEndDate.getMinutes() + 1);
    clearTimeout(this._timeout);
    this._timeout = setTimeout(
      this.removeFilters.bind(this),
      this._timeoutEndDate.getTime() - new Date().getTime()
    );
    if (this._existingFilters.length === 0)
      for (const sourceName of this._sourceNames) this.addFilter(sourceName);
  }

  private addFilter(sourceName: string): void {
    const count: number = this._existingFilters.length;
    OBS._obs
      .send('AddFilterToSource', {
        sourceName,
        filterName: `Saturation ${count.toString()}`,
        filterType: 'color_filter',
        filterSettings: { saturation: 1.5 },
      })
      .catch(console.error);
    this._existingFilters.push(sourceName);
  }

  removeFilters(): void {
    for (let i = 0; i < this._sourceNames.length; i++) {
      const sourceName: string = this._sourceNames[i];
      new FilterRemover(sourceName, i).removeFilter();
    }
    this._existingFilters = [];
  }

  ensureConnection(callback: () => void) {
    if (!OBS._obs) {
      OBS._obs = new OBSWebSocket();
      OBS._obs.connect().then(callback.bind(this)).catch(console.error);
      return;
    }
    callback();
  }
}
