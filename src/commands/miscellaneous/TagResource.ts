import { StudyChannel } from "@/mongo/schemas/StudyChannel";
import { v4 as uuidv4 } from "uuid";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
    type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Colors,
    EmbedBuilder,
    type Message,
    ModalBuilder,
    SlashCommandBuilder,
    StringSelectMenuOptionBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import {ButtonInteractionCache, GuildPreferencesCache} from "@/redis";
import {ResourceTag} from "@/mongo";
// import {PaginationBuilder} from "@discordforge/pagination";
import {PaginationBuilder} from "@/components/InteractionPagination.ts"
import Fuse from "fuse.js";
import SelectButtonless from "@/components/SelectButtonless.ts";

export default class ResourceTagCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName("resource_tag")
                .setDescription("Group of commands for tagging resources")
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("request")
                        .setDescription("Request a message to be tagged")
                        .addStringOption((option) =>
                            option
                                .setName("message_id")
                                .setDescription("The id of the message to be tagged")
                                .setRequired(true),
                        ),
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("search")
                        .setDescription("Search for a tagged resource in the database")
                        .addStringOption((option) =>
                            option
                                .setName("query")
                                .setDescription("The resource tag search query")
                                .setRequired(false),
                        )
                        .addChannelOption((option) =>
                            option
                                .setName("channel")
                                .setDescription("The channel to search in")
                                .setRequired(false),
                        ),
                )
                .setDMPermission(false),
        );
    }

    async execute(
        client: DiscordClient<true>,
        interaction: DiscordChatInputCommandInteraction<"cached">,
    ) {
        switch (interaction.options.getSubcommand()) {
            case "search":
                const query = interaction.options.getString("query", false);
                const channeId = interaction.options.getChannel("channel", false);

                const tagsSearch = await ResourceTag.find({
                    channelId: channeId?.id ?? interaction.channelId,
                });

                const options = {
                    keys: ['title', 'description'],
                    shouldSort: true,
                    threshold: 0.3,
                    ignoreLocation: true,
                    distance: 100,
                    includeMatches: true,
                    includeScore: true,
                    useExtendedSearch: true
                };

                if (!query) {
                    await new PaginationBuilder(
                        tagsSearch.map(({ title, description, messageUrl, authorId, _id }) => ({
                            name: title + ` | ||${_id}||`,
                            description: description + '\n\n' + messageUrl + `\nBy: <@${authorId}>`
                        })),
                        async ({ name, description }) => ({
                            name: name,
                            value: description
                        }),
                        [],
                        true
                    )
                        .setTitle("Resource Tag Search Results")
                        .setColor(Colors.Blurple)
                        .build((page) => {
                            const imsg = interaction.reply(page)
                            return {interaction, message: imsg}
                        }, [interaction.user.id]);
                    return
                }
                const fuse = new Fuse(tagsSearch, options);

                const results = fuse.search(query);

                let selectOptions: StringSelectMenuOptionBuilder[] = []

                results.forEach(({ item }) => {
                    selectOptions.push(new StringSelectMenuOptionBuilder(
                        {
                            label: item.title,
                            value: item._id + "_resource_tag",
                        }
                    ))
                })

                const customid = uuidv4()

                const selectSend = new SelectButtonless("send_resource", "Send a resource to the chat", selectOptions, 1, `${customid}_send_resource`)

                const selectRow = new ActionRowBuilder()
                    .addComponents(selectSend)

                let selectInteractionMsg: Promise<Message<true>>;

                await new PaginationBuilder(
                    results.map(({ item }) => ({
                        name: item.title + ` | ||${item._id}||`,
                        description: item.description + '\n\n' + item.messageUrl + `\nBy: <@${item.authorId}>`
                    })),
                    async ({ name, description }) => ({
                        name: name,
                        value: description
                    }),
                    results.length > 0 ? [selectRow] : [],
                    true
                )
                    .setTitle("Resource Tag Search Results")
                    .setColor(Colors.Blurple)
                    .build((page) => {
                        selectInteractionMsg = interaction.reply(page)
                        return {interaction, message: selectInteractionMsg}
                    }, [interaction.user.id]);

                const selectInteractionMsgObj: Message<true> = await selectInteractionMsg;

                const response = await selectSend.waitForResponse(
                    `${customid}_send_resource`,
                    selectInteractionMsgObj,
                )

                if (!response || response === "Timed out") {
                    interaction.followUp({
                        content: "An error occured",
                        ephemeral: true,
                    });
                    return;
                }

                response.on("collect", async (i) => {
                    const resource = await ResourceTag.findById(i.values[0].split("_")[0])

                    const resourceEmbed = new EmbedBuilder()
                        .setTitle(resource.title)
                        .setDescription(resource.description + "\n\n" + resource.messageUrl)
                        .setAuthor({name: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL()})
                        .setColor("Blurple")

                    await i.channel.send({
                        embeds: [resourceEmbed]
                    })

                    await interaction.editReply({
                        content: "Resource sent!",
                        embeds: [],
                        components: [],
                    })
                });

                break;
            case "request":
                if (!interaction.channel) return;
                const targetMessageId = interaction.options.getString("message_id", true);
                let targetMessage: Message<true>;

                try {
                    targetMessage = await interaction.channel.messages.fetch(targetMessageId);
                }catch {
                    await interaction.reply({
                        content: "Message not found.",
                        ephemeral: true,
                    });

                    return;
                }

                const studyChannel = await StudyChannel.findOne({
                    guildId: interaction.guildId,
                    channelId: interaction.channelId,
                });

                if (!studyChannel) {
                    interaction.reply({
                        content: "This can only be used for a study channel!",
                        ephemeral: true,
                    });

                    return;
                }

                const guildPreferences = await GuildPreferencesCache.get(
                    interaction.guildId
                );

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
                    messageUrl: targetMessage.url,
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
                    .setTitle("Request Resource Tag")
                    .addComponents(row1, row2)

                await interaction.showModal(modal);

                const modalInteraction = await interaction.awaitModalSubmit({
                    time: 600_000,
                    filter: (i) => i.customId === modalCustomId
                })

                const title = modalInteraction.fields.getTextInputValue("tag-title-input");
                const description = modalInteraction.fields.getTextInputValue("tag-description-input");

                await modalInteraction.reply({
                    content: "Your tag request has been sent to the helpers.\nYou have to wait for them to approve it.",
                })

                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(description)
                    .setColor("Random")
                    .addFields(
                        {
                            name: "Requested By",
                            value: interaction.user.tag,
                            inline: true
                        },
                        {
                            name: "Message Link",
                            value: targetMessage.url,
                            inline: true
                        },
                        {
                            name: "Channel",
                            value: `<#${interaction.channel.id}>`,
                            inline: true
                        }
                    )
                    .setAuthor({
                        name: interaction.user.tag + " | " + interaction.user.id,
                        iconURL: interaction.user.displayAvatarURL(),
                    })

                const customId = uuidv4();

                const approveButton = new ButtonBuilder()
                    .setCustomId(`${customId}_tag_accept`)
                    .setLabel("Approve")
                    .setStyle(ButtonStyle.Success);

                const rejectButton = new ButtonBuilder()
                    .setCustomId(`${customId}_tag_reject`)
                    .setLabel("Deny")
                    .setStyle(ButtonStyle.Danger);

                const row = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(approveButton, rejectButton);

                const message = await approvalChannel.send({
                    embeds: [embed],
                    components: [row],
                });

                await ButtonInteractionCache.set(`${customId}_tag`, {
                    customId: `${customId}_tag`,
                    messageId: message.id,
                    guildId: interaction.guildId,
                    userId: interaction.user.id,
                })

                await ButtonInteractionCache.expire(
                    `${customId}_tag`,
                    3*24*60*60
                )
        }
    }
}
