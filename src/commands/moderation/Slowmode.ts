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
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("add")
                        .setDescription("Add a slowmode")
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
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("remove")
                        .setDescription("Removes the current slowmode")
                        .addChannelOption((option) =>
                            option
                                .setName("channel")
                                .setDescription("Channel to remove the slowmode from")
                                .setRequired(false)
                        )
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        );
    }

    async execute(
        client: DiscordClient<true>,
        interaction: DiscordChatInputCommandInteraction<"cached">
    ) {
        const timeString = interaction.options.getString("time") ?? "0s";
        const channel = interaction.options.getChannel("channel", false) ?? interaction.channel;

        const time = parse(timeString, "second") ?? 0

        if (!channel || !channel.isTextBased()) {
            interaction.reply({
                content: "Channel must be text-based",
                ephemeral: true
            })
            return;
        }

        switch (interaction.options.getSubcommand()) {
            case "add":
                if (time > 21600 || time < 1) {
                    interaction.reply({
                        content: "Enter a valid time between 6 hours and 1 second",
                        ephemeral: true
                    });
                    return;
                }

                await channel.setRateLimitPerUser(time);

                interaction.reply({
                    content: `Added a slowmode of ${timeString} to ${channel}`,
                    ephemeral: true
                });
                break;
            case "remove":
                await channel.setRateLimitPerUser(0);
                interaction.reply({
                    content: `Removed slowmode from ${channel}`,
                    ephemeral: true
                })
                break;
        }
    }
}
