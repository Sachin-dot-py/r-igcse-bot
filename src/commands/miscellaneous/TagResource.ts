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
                    if (!resource) {
                        await i.channel.send("Resource not found")
                        return
                    }

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
        }
    }
}
