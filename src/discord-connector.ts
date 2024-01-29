import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { Config } from './types/config';
import { commands } from './commands';

export class DiscordConnector {
    config: Config;
    client: Client;
    subscribers: Set<string>;

    constructor(config: Config) {
        this.config = config;
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
            ],
        });
        this.subscribers = new Set<string>();
    }

    async setCommands() {
        const rest = new REST().setToken(this.config.discord.clientToken);
        await rest.put(
            Routes.applicationCommands(this.config.discord.clientId),
            { body: commands }
        );

        console.info('Successfully reloaded application (/) commands.');
    }

    async init() {
        await this.setCommands();

        this.client.login(this.config.discord.clientToken);

        this.client.once('ready', () => {
            console.log(`Logged in as ${this.client.user?.tag}`);
        });

        this.client.on('interactionCreate', (interaction) => {
            if (!interaction.isCommand()) return;

            const { commandName, channel } = interaction;

            const channelId = channel?.id;
            if (channelId == null) {
                throw new Error('channel id does not exist');
            }

            switch (commandName) {
                case 'ping':
                    interaction.reply('pong!');
                    break;
                case 'subscribe':
                    this.subscribers.add(channelId);
                    interaction.reply('구독 완료!');
                    console.info('subscribe:', channelId);
                    break;
                case 'unsubscribe':
                    this.subscribers.delete(channelId);
                    interaction.reply('구독해지 완료!');
                    console.info('unsubscribe:', channelId);
                    break;
                default:
                    interaction.reply('추가되지 않은 커맨드입니다.');
                    console.log('undefined command');
                    break;
            }
        });
    }

    // TODO: 메시지 보낼 때 포맷팅 필수
    async sendMessage() {
        this.client.on('message', (msg) => {});
    }
}
