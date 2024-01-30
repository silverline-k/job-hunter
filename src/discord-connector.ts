import {
    APIEmbed,
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    TextChannel,
} from 'discord.js';
import { Config } from './types/config';
import { commands } from './commands';
import { JobInfo } from './types';

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

    parseData(jobInfo: JobInfo): APIEmbed {
        // 너무 길어지면 보기 힘들어서 150으로 줄임
        const VALUE_LIMIT = 150; // 최대 1024

        const fields = [
            { name: '주요업무', value: jobInfo.mainResponsibilities || '' },
            { name: '자격요건', value: jobInfo.qualifications || '' },
            { name: '우대사항', value: jobInfo.preferences || '' },
            { name: '혜택 및 복지', value: jobInfo.welfareBenefits || '' },
        ].map((obj) => {
            let value = obj.value;

            if (obj.value.length > 0) {
                value = value
                    .split('<br>')
                    .filter((value) => value.length > 0)
                    .join('\n');
            }

            if (obj.value.length > VALUE_LIMIT) {
                value = value.substring(0, VALUE_LIMIT - 1) + '...';
            }

            return {
                name: obj.name,
                value: value,
            };
        });

        return {
            title: jobInfo.positionTitle,
            author: {
                name: jobInfo.companyName,
            },
            url: jobInfo.url,
            fields,
        };
    }

    send(data: APIEmbed): void {
        for (const subscriber of this.subscribers) {
            const channel = this.client.channels.cache.get(subscriber);

            if (channel) {
                (channel as TextChannel).send({ embeds: [data] });
            }
        }
    }
}
