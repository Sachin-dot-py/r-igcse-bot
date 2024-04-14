import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
    type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import parse from "parse-duration";

export default class SlowmodeCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName("slowmode")
                .setDescription("Set the slowmode time (for mods)")
                .setDMPermission(false)
                .addStringOption((option) =>
                    option
                        .setName("time")
                        .setDescription("Slowmode time")
                        .setRequired(true)
                )
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription("The channel to add the slowmode to")
                        .setRequired(false)
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        );
    }

    async execute(
        client: DiscordClient<true>,
        interaction: DiscordChatInputCommandInteraction<"cached">
    ) {
        const timeString = interaction.options.getString("time", true) ?? "0s";
        const channel = interaction.options.getChannel("channel", false) ?? interaction.channel;

        const time = parse(timeString, "second") ?? 0

        if (!channel || !channel.isTextBased()) {
            interaction.reply({
                content: "Channel must be text-based",
                ephemeral: true
            })
            return;
        }

        if (time > 21600 || time < 0) {
            interaction.reply({
                content: "Enter a valid time between 6 hours and 0 seconds",
                ephemeral: true
            });
            return;
        }

        await channel.setRateLimitPerUser(time);

        interaction.reply({
            content: `Added a slowmode of ${timeString} to ${channel}`,
            ephemeral: true
        });
    }
}
