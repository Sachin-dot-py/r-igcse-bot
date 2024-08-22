import {ResourceTag} from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import {
    ActionRowBuilder,
    Colors,
    EmbedBuilder,
    type Message, ModalBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextInputBuilder, TextInputStyle
} from "discord.js";
import BaseCommand, {
    type DiscordChatInputCommandInteraction,
} from "../../registry/Structure/BaseCommand";
import {StudyChannel} from "@/mongo/schemas/StudyChannel.ts";
import {GuildPreferencesCache} from "@/redis";
import {v4 as uuidv4} from "uuid";

export default class TagResourceControlsCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName("resource_tag_control")
                .setDescription("Delete a tag from the database (for mods)")
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("delete")
                        .setDescription("Delete a tag from the database")
                        .addStringOption((option) =>
                            option
                                .setName("id")
                                .setDescription("The id of the resource tag you want to delete (for mods)")
                                .setRequired(true),
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("add")
                        .setDescription("Force add a tag to the database")
                        .addStringOption((option) =>
                            option
                                .setName("message_url")
                                .setDescription("The url of the message you want to tag (for mods)")
                                .setRequired(true),
                        )
                        .addChannelOption((option) =>
                            option
                                .setName("channel")
                                .setDescription("The channel of the message you want to tag (for mods)")
                                .setRequired(true),
                        )
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
                .setDMPermission(false),
        );
    }

    async execute(
        client: DiscordClient<true>,
        interaction: DiscordChatInputCommandInteraction<"cached">,
    ) {
        switch (interaction.options.getSubcommand(true)) {
            case "delete":
                const tagsDel = await ResourceTag.findById(interaction.options.getString("id", true));
                if (!tagsDel) {
                    await interaction.reply({
                        content: "Resource Tag not found.",
                        ephemeral: true,
                    });
                    return;
                }

                await ResourceTag.findByIdAndDelete(interaction.options.getString("id", true));

                await interaction.reply({
                    content: "Resource Tag deleted.",
                    ephemeral: true,
                });

                break;
            case "add":
                if (!interaction.channel) return;
                const targetMessageUrl = interaction.options.getString("message_url", true);
                const targetChannel = interaction.options.getChannel("channel", true);

                const guildPreferences = await GuildPreferencesCache.get(
                    interaction.guildId
                );

                const urlRegex = new RegExp(/(https?:\/\/[^\s]+)/g);
                if (!urlRegex.test(targetMessageUrl)) {
                    await interaction.reply({
                        content: "Invalid message url.",
                        ephemeral: true,
                    });
                    return;
                }

                if (
                    !guildPreferences ||
                    !guildPreferences.tagResourceApprovalChannelId
                ) {
                    await interaction.reply({
                        content:
                            "Please setup the bot using the command `/setup` first.",
                        ephemeral: true
                    });

                    return;
                }

                const approvalChannel = interaction.guild.channels.cache.get(
                    guildPreferences?.tagResourceApprovalChannelId
                );

                if (!approvalChannel || !approvalChannel.isTextBased()) {
                    await interaction.reply({
                        content:
                            "Invalid configuration for resource tags. Please contact an admin.",
                        ephemeral: true
                    });

                    return;
                }

                const tags = await ResourceTag.findOne({
                    messageUrl: targetMessageUrl,
                });

                if (tags) {
                    await interaction.reply({
                        content: "This message already has already been tagged as a resource.",
                        ephemeral: true,
                    });

                    return;
                }

                const titleInput = new TextInputBuilder()
                    .setCustomId("tag-title-input")
                    .setLabel("Title")
                    .setPlaceholder("Enter the title of the tag")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short);

                const descriptionInput = new TextInputBuilder()
                    .setCustomId("tag-description-input")
                    .setLabel("Description")
                    .setPlaceholder("Enter the description of the tag")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Paragraph);

                const row1 = new ActionRowBuilder<TextInputBuilder>()
                    .addComponents(titleInput);

                const row2 = new ActionRowBuilder<TextInputBuilder>()
                    .addComponents(descriptionInput);

                const modalCustomId = uuidv4();

                const modal = new ModalBuilder()
                    .setCustomId(modalCustomId)
                    .setTitle("Add Resource Tag")
                    .addComponents(row1, row2)

                await interaction.showModal(modal);

                const modalInteraction = await interaction.awaitModalSubmit({
                    time: 600_000,
                    filter: (i) => i.customId === modalCustomId
                })

                const title = modalInteraction.fields.getTextInputValue("tag-title-input");
                const description = modalInteraction.fields.getTextInputValue("tag-description-input");

                const newRes = await ResourceTag.create({
                    guildId: interaction.guildId,
                    title,
                    description,
                    authorId: interaction.user.id,
                    channelId: targetChannel.id,
                    messageUrl: targetMessageUrl,
                });

                await modalInteraction.reply({
                    content: `Resource tag added with ID \`${newRes._id}\``,
                    ephemeral: true,
                });
                break;
        }
    }
}
