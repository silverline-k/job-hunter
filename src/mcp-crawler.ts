// import Crawler from './crawler';
import { Config } from './types/config';
import Repository from './repository';

export class McpCrawler {
  config: Config;
  repository: Repository;

  constructor(
      config: Config,
      repository: Repository,
  ) {
      this.config = config;
      this.repository = repository;
  }
}