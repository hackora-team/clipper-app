import { config } from "dotenv";

config({ path: "../../.env" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
	connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
	// Upsert plans
	const freePlan = await prisma.plan.upsert({
		where: { name: "free" },
		update: {},
		create: {
			name: "free",
			displayName: "Free",
			maxVideoMinutes: 10,
			maxFileSize: 100,
			maxClipsPerVideo: 3,
			priorityQueue: false,
			customSubtitleStyle: false,
		},
	});

	const proPlan = await prisma.plan.upsert({
		where: { name: "pro" },
		update: {},
		create: {
			name: "pro",
			displayName: "Pro",
			maxVideoMinutes: 30,
			maxFileSize: 500,
			maxClipsPerVideo: 5,
			priorityQueue: true,
			customSubtitleStyle: false,
		},
	});

	const businessPlan = await prisma.plan.upsert({
		where: { name: "business" },
		update: {},
		create: {
			name: "business",
			displayName: "Business",
			maxVideoMinutes: 60,
			maxFileSize: 2048,
			maxClipsPerVideo: 10,
			priorityQueue: true,
			customSubtitleStyle: true,
		},
	});

	// Upsert subscription options
	// Pro: 20 credits/Rp20.000, 40 credits/Rp40.000
	await prisma.subscriptionOption.upsert({
		where: { id: "pro-20" },
		update: {},
		create: {
			id: "pro-20",
			planId: proPlan.id,
			creditsPerMonth: 20,
			pricePerMonth: 20000,
			label: "20 credits/month",
		},
	});

	await prisma.subscriptionOption.upsert({
		where: { id: "pro-40" },
		update: {},
		create: {
			id: "pro-40",
			planId: proPlan.id,
			creditsPerMonth: 40,
			pricePerMonth: 40000,
			label: "40 credits/month",
		},
	});

	// Business: 20 credits/Rp40.000, 40 credits/Rp80.000
	await prisma.subscriptionOption.upsert({
		where: { id: "business-20" },
		update: {},
		create: {
			id: "business-20",
			planId: businessPlan.id,
			creditsPerMonth: 20,
			pricePerMonth: 40000,
			label: "20 credits/month",
		},
	});

	await prisma.subscriptionOption.upsert({
		where: { id: "business-40" },
		update: {},
		create: {
			id: "business-40",
			planId: businessPlan.id,
			creditsPerMonth: 40,
			pricePerMonth: 80000,
			label: "40 credits/month",
		},
	});

	// Create mock dev user with Pro plan
	const mockUser = await prisma.user.upsert({
		where: { email: "dev@test.com" },
		update: {},
		create: {
			id: "mock-user-id",
			email: "dev@test.com",
			passwordHash: "$2b$10$placeholder", // not a real hash
			name: "Dev User",
			creditBalance: 100,
		},
	});

	// Create subscription for mock user
	await prisma.subscription.upsert({
		where: { userId: mockUser.id },
		update: {},
		create: {
			userId: mockUser.id,
			planId: proPlan.id,
			optionId: "pro-20",
			creditsPerMonth: 20,
			creditsRemaining: 20,
			currentPeriodStart: new Date(),
			currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		},
	});

	// Create signup bonus credit transaction
	await prisma.creditTransaction.upsert({
		where: { id: "mock-signup-bonus" },
		update: {},
		create: {
			id: "mock-signup-bonus",
			userId: mockUser.id,
			type: "SIGNUP_BONUS",
			amount: 5,
			balance: 5,
			description: "Signup bonus: 5 free credits",
		},
	});

	console.log("Seed completed:");
	console.log(
		`  Plans: ${freePlan.displayName}, ${proPlan.displayName}, ${businessPlan.displayName}`,
	);
	console.log(
		`  Mock user: ${mockUser.email} (${mockUser.creditBalance} credits)`,
	);
}

main()
	.catch((e) => {
		console.error("Seed failed:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
