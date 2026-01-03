import { Reputation, ReputationData } from "@/mongo";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
    type DiscordChatInputCommandInteraction,
} from "@/registry/Structure/BaseCommand";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export default class extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName("set_rep")
                .setDescription("Change a users reputation (for mods)")
                .setDMPermission(false)
                .addIntegerOption((option) =>
                    option
                        .setName("new_rep")
                        .setDescription("New reputation")
                        .setRequired(true)
                )
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("The user to change the rep of")
                        .setRequired(true)
                )
                .addUserOption((option) =>
                    option
                        .setName("repped_by")
                        .setDescription("The user who gave the rep")
                        .setRequired(false)
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        );
    }

    async execute(
        client: DiscordClient<true>,
        interaction: DiscordChatInputCommandInteraction<"cached">
    ) {
        const user = interaction.options.getUser("user", true);
        const newRep = interaction.options.getInteger("new_rep", true);
        const reppedBy = interaction.options.getUser("repped_by", false);

        const currentRepDocument = await Reputation.findOne({
            guildId: interaction.guild.id,
            userId: user.id,
        });

        const currentRep = currentRepDocument?.rep ?? 0;

        if (newRep === currentRep) {
            await interaction.reply({
                content: `<@${user.id}>'s rep is already ${newRep}`,
            });
            return;
        }

        const res = await Reputation.updateOne(
            {
                guildId: interaction.guild.id,
                userId: user.id,
            },
            {
                $set: { rep: newRep },
            },
            {
                upsert: true,
            }
        );

        if (res.modifiedCount + res.upsertedCount === 0) {
            await interaction.reply({
                content: "Failed to change rep",
            });
            return;
        }

        if (newRep > currentRep) {
            const addedAmount = newRep - currentRep;
            const newDocs = [];

            for (let i = 0; i < addedAmount; i++) {
                newDocs.push({
                    guildId: interaction.guild.id,
                    channelId: interaction.channelId,
                    when: new Date(),
                    repNumber: currentRep + i + 1,
                    reppedUser: user.id,
                    reppedBy: reppedBy?.id ?? interaction.user.id,
                });
            }

            await ReputationData.insertMany(newDocs);
        } else if (newRep < currentRep) {
            const repDifference = currentRep - newRep;

            const filter: any = {
                guildId: interaction.guildId,
                reppedUser: user.id,
                deleted: { $ne: true },
            };

            if (reppedBy) {
                filter.reppedBy = reppedBy.id;
            }

            const toBeDeleted = await ReputationData.find(filter)
                .sort({ repNumber: -1, when: -1 })
                .limit(repDifference);

            if (toBeDeleted.length) {
                const ids = toBeDeleted.map((d) => d._id);
                await ReputationData.updateMany(
                    { _id: { $in: ids } },
                    { $set: { deleted: true } }
                );
            }
        }

        await interaction.reply({
            content: `Changed <@${user.id}>'s rep to ${newRep}`,
        });
    }
}
