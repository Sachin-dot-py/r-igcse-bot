import { Colors, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, type InteractionReplyOptions } from "discord.js";
import BaseCommand, {
    type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import type { DiscordClient } from "@/registry/DiscordClient";
import { ScheduledMessage } from "@/mongo/schemas/ScheduledMessage";
import Pagination from "@/components/Pagination";
import { ChannelLockdown } from "@/mongo/schemas/ChannelLockdown";

export default class ScheduledCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName("scheduled")
                .setDescription("View previously scheduled things")
                .addSubcommand((command) =>
                    command
                        .setName("messages")
                        .setDescription("View previously scheduled messages/embeds")
                )
                .addSubcommand((command) =>
                    command
                        .setName("lockdowns")
                        .setDescription("View previously scheduled channel lockdowns")
                )
                .setDMPermission(false)
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        );
    }

    async execute(
        client: DiscordClient<true>,
        interaction: DiscordChatInputCommandInteraction<"cached">
    ) {
        switch (interaction.options.getSubcommand()) {
            case ("messages"): {
                const messages = await ScheduledMessage.find({
                    guildId: interaction.guildId!
                });

                if (!messages) {
                    interaction.reply({
                        content: "There are no scheduled messages or embeds",
                        ephemeral: true
                    });

                    return;
                }

                await interaction.reply({
                    content: "The following messages and embeds were found",
                    ephemeral: true
                })

                messages.forEach(async (doc) => {
                    await interaction.followUp({
                        content: `Message to be sent <t:${doc.scheduleTime}:R>:\n\`\`\`${doc.message.content}\n\`\`\``,
                        embeds: doc.message.embeds,
                        ephemeral: true
                    });
                });

                break;
            }
            case ("lockdowns"): {
                const lockdowns = await ChannelLockdown.find({
                    guildId: interaction.guildId!
                })

                if (!lockdowns || lockdowns.length === 0) {
                    interaction.reply({
                        content: "There are no channels scheduled to be locked",
                        ephemeral: true
                    });

                    return;
                }

                const chunks = Array.from(
                    { length: Math.ceil(lockdowns.length / 5) },
                    (_, i) => lockdowns.slice(i * 5, i * 5 + 5)
                );

                const paginator = new Pagination(chunks, async (chunk) => {
                    const embed = new EmbedBuilder()
                        .setTitle("Scheduled Lockdowns")
                        .setColor(Colors.Blurple)
                        .setDescription(
                            `Page ${chunks.indexOf(chunk) + 1} of ${chunks.length}`
                        );

                    for (const { startTimestamp, channelId } of chunk)
                        embed.addFields({ name: `${interaction.guild.channels.cache.get(channelId)?.name} <t:${parseFloat(startTimestamp).toFixed(0)}:R>`, value: "\n", inline: false });

                    return { embeds: [embed] };
                });

                await paginator.start({
                    interaction,
                    ephemeral: false
                });
            }
        }
    }
}
