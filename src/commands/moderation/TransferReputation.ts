import { Reputation, ReputationData } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import { ModNote } from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
    type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { logToChannel } from "@/utils/Logger";
import {
    Colors,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";

export default class extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName("transfer_rep")
                .setDescription(
                    "Transfer a users reputation to another account (for mods)"
                )
                .setDMPermission(false)
                .addUserOption((option) =>
                    option
                        .setName("sender")
                        .setDescription("The rep sender")
                        .setRequired(true)
                )
                .addUserOption((option) =>
                    option
                        .setName("recipient")
                        .setDescription("The rep recipient")
                        .setRequired(true)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("amount")
                        .setDescription(
                            "The amount of rep to transfer (defaults to all)"
                        )
                        .setRequired(false)
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        );
    }

    async execute(
        client: DiscordClient<true>,
        interaction: DiscordChatInputCommandInteraction<"cached">
    ) {
        const sender = interaction.options.getUser("sender", true);
        const recipient = interaction.options.getUser("recipient", true);

        const currentSenderRepDocument = await Reputation.findOne({
            guildId: interaction.guild.id,
            userId: sender.id,
        });

        const currentRecipientRepDocument = await Reputation.findOne({
            guildId: interaction.guild.id,
            userId: recipient.id,
        });

        const currentSenderRep = currentSenderRepDocument?.rep ?? 0;
        const currentRecipientRep = currentRecipientRepDocument?.rep ?? 0;

        const amount =
            interaction.options.getInteger("amount", false) ?? currentSenderRep;

        const guildPreferences = await GuildPreferencesCache.get(
            interaction.guildId
        );

        if (!guildPreferences) {
            interaction.reply({
                content:
                    "Please setup the bot using the command `/setup` first.",
            });
            return;
        }

        if (currentSenderRep < 1) {
            await interaction.reply({
                content: "The sender does not have any rep 😭🙏",
                flags: MessageFlags.Ephemeral,
            });
            return;
        } else if (amount < 1) {
            await interaction.reply({
                content: "You must transfer at least 1 rep",
                flags: MessageFlags.Ephemeral,
            });
            return;
        } else if (currentSenderRep < amount) {
            await interaction.reply({
                content: `The sender (<@${sender.id}>) does not have enough rep (${currentSenderRep})`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const newSenderRep = currentSenderRep - amount;
        const newRecipientRep = currentRecipientRep + amount;

        await Reputation.updateOne(
            {
                guildId: interaction.guild.id,
                userId: sender.id,
            },
            {
                $set: { rep: newSenderRep },
            },
            {
                upsert: true,
            }
        );

        await Reputation.updateOne(
            {
                guildId: interaction.guild.id,
                userId: recipient.id,
            },
            {
                $set: { rep: newRecipientRep },
            },
            {
                upsert: true,
            }
        );

        const toBeTransferred = await ReputationData.find({
            guildId: interaction.guildId,
            reppedUser: sender.id,
            deleted: { $ne: true },
        })
            .sort({ repNumber: -1, when: -1 })
            .limit(amount);

        const recipientReps = await ReputationData.find({
            guildId: interaction.guildId,
            reppedUser: recipient.id,
            deleted: { $ne: true },
        });

        const allReps = [...recipientReps, ...toBeTransferred];

        allReps.sort((a, b) => a.when.getTime() - b.when.getTime());

        if (allReps.length) {
            const transfers = allReps.map((doc, i) => ({
                updateOne: {
                    filter: { _id: doc._id },
                    update: {
                        $set: {
                            reppedUser: recipient.id,
                            repNumber: i + 1,
                        },
                    },
                },
            }));

            await ReputationData.bulkWrite(transfers);
        }

        const modEmbed = new EmbedBuilder()
            .setTitle(`Reputation Transfer`)
            .setColor(Colors.Red)
            .addFields([
                {
                    name: "Sender",
                    value: `<@${sender.id}> (${sender.id})`,
                    inline: false,
                },
                {
                    name: "Recipient",
                    value: `<@${recipient.id}> (${recipient.id})`,
                    inline: false,
                },
                {
                    name: "Moderator",
                    value: `${interaction.user.tag} (${interaction.user.id})`,
                    inline: false,
                },
                {
                    name: "Amount",
                    value: `${amount} Rep`,
                },
            ]);

        if (guildPreferences.modlogChannelId) {
            logToChannel(interaction.guild, guildPreferences.modlogChannelId, {
                embeds: [modEmbed],
            });
        }

        const existingAltNoteSender = await ModNote.findOne({
            guildId: interaction.guild.id,
            actionAgainst: sender.id,
            note: { $regex: `\\(${recipient.id}\\)` },
        });

        if (!existingAltNoteSender) {
            await ModNote.create({
                guildId: interaction.guild.id,
                actionAgainst: sender.id,
                actionBy: interaction.user.id,
                note: `Alt account: ${recipient.tag} (${recipient.id})`,
                when: new Date(),
            });
        }

        const existingAltNoteRecipient = await ModNote.findOne({
            guildId: interaction.guild.id,
            actionAgainst: recipient.id,
            note: { $regex: `\\(${sender.id}\\)` },
        });

        if (!existingAltNoteRecipient) {
            await ModNote.create({
                guildId: interaction.guild.id,
                actionAgainst: recipient.id,
                actionBy: interaction.user.id,
                note: `Alt account: ${sender.tag} (${sender.id})`,
                when: new Date(),
            });
        }

        await interaction.reply({
            content: `Transferred ${amount} rep from <@${sender.id}> (${newSenderRep}) to <@${recipient.id}> (${newRecipientRep})`,
        });
    }
}
