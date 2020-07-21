import OBS from './OBS';

interface Filter {
    enabled: boolean;
    name: string;
    settings: {saturation: number};
    type: string;
}

export default class FilterRemover {
  private _source: { name: string; count: number };

  constructor(filterName: string, count: number) {
    this._source = { name: filterName, count };
  }

  removeFilter(): void {
    OBS._obs
      .send('GetSourceFilters', { sourceName: this._source.name })
      .then(this.sourceFiltersCallback.bind(this))
      .catch(console.error);
  }

  private sourceFiltersCallback(value: {
    messageId: string;
    status: 'ok';
    filters: Filter[];
  }): void {
    if (value.filters.find(this.findFilter.bind(this)))
      OBS._obs
        .send('RemoveFilterFromSource', {
          filterName: `Saturation ${this._source.count}`,
          sourceName: this._source.name,
        })
        .catch(console.error);
  }

  private findFilter(value: Filter): boolean {
    return value.name === `Saturation ${this._source.count}`;
  }
}
