#!/usr/bin/env node

import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";

const API_BASE = process.env.API_BASE || "http://localhost:3000";

// Event display configuration
const EVENT_COLORS: Record<string, (text: string) => string> = {
  BookingRequested: chalk.blue,
  PricingCalculated: chalk.cyan,
  DiscountQuotaReserved: chalk.green,
  DiscountQuotaRejected: chalk.red,
  PaymentCompleted: chalk.green,
  PaymentFailed: chalk.red,
  BookingConfirmed: chalk.bgGreen.black,
  BookingFailed: chalk.bgRed.white,
  CompensationTriggered: chalk.yellow,
  DiscountQuotaReleased: chalk.magenta,
  PaymentReversed: chalk.magenta,
};

const EVENT_ICONS: Record<string, string> = {
  BookingRequested: "📝",
  PricingCalculated: "💰",
  DiscountQuotaReserved: "🎫",
  DiscountQuotaRejected: "❌",
  PaymentCompleted: "💳",
  PaymentFailed: "⚠️",
  BookingConfirmed: "✅",
  BookingFailed: "❌",
  CompensationTriggered: "🔄",
  DiscountQuotaReleased: "↩️",
  PaymentReversed: "↩️",
};

interface Service {
  id: string;
  name: string;
  price: number;
  gender: string;
  description: string;
}

interface SagaEvent {
  eventType: string;
  service: string;
  status: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface BookingStatus {
  correlationId: string;
  booking: {
    status: string;
    referenceId?: string;
    finalPrice?: number;
    discountApplied?: boolean;
    errorMessage?: string;
  };
  events: SagaEvent[];
  isComplete: boolean;
}

// Test scenarios
interface TestScenario {
  name: string;
  customerName: string;
  gender: "male" | "female";
  dateOfBirth: string;
  serviceIds: string[];
  setupAction?: string;
}

const TEST_SCENARIOS: Record<string, TestScenario> = {
  happy: {
    name: "Happy Path - Birthday Discount",
    customerName: "Priya Sharma",
    gender: "female",
    // Today's date for birthday discount
    dateOfBirth: new Date()
      .toISOString()
      .split("T")[0]
      .replace(/^\d{4}/, "1990"),
    serviceIds: ["general-consultation", "mammography"],
  },
  "quota-exhausted": {
    name: "Quota Exhausted Scenario",
    customerName: "Anita Patel",
    gender: "female",
    dateOfBirth: new Date()
      .toISOString()
      .split("T")[0]
      .replace(/^\d{4}/, "1988"),
    serviceIds: ["general-consultation", "gynecology"],
    setupAction: "exhaust-quota",
  },
  "payment-failure": {
    name: "Payment Failure with Compensation",
    customerName: "Rahul Kumar",
    gender: "male",
    dateOfBirth: "1985-05-15",
    serviceIds: ["general-consultation", "x-ray", "ultrasound"], // > ₹1000 for discount
    setupAction: "reset-quota",
  },
};

async function fetchServices(gender: string): Promise<Service[]> {
  const response = await fetch(`${API_BASE}/api/services?gender=${gender}`);
  const data = (await response.json()) as { services: Service[] };
  return data.services;
}

async function submitBooking(bookingData: {
  customerName: string;
  gender: string;
  dateOfBirth: string;
  serviceIds: string[];
}): Promise<string> {
  const response = await fetch(`${API_BASE}/api/booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bookingData),
  });
  const result = (await response.json()) as {
    correlationId?: string;
    error?: string;
  };

  if (!result.correlationId) {
    throw new Error(result.error || "Failed to submit booking");
  }

  return result.correlationId;
}

async function getBookingStatus(correlationId: string): Promise<BookingStatus> {
  const response = await fetch(
    `${API_BASE}/api/booking/${correlationId}/status`,
  );
  return (await response.json()) as BookingStatus;
}

async function setupTestScenario(action: string): Promise<void> {
  await fetch(`${API_BASE}/api/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
}

async function pollSagaStatus(correlationId: string): Promise<void> {
  console.log(chalk.gray("\n─────────────────────────────────────────"));
  console.log(chalk.bold("📡 Real-time Event Stream"));
  console.log(chalk.gray("─────────────────────────────────────────\n"));

  let lastEventCount = 0;
  let isComplete = false;

  while (!isComplete) {
    const status = await getBookingStatus(correlationId);

    // Display new events
    for (let i = lastEventCount; i < status.events.length; i++) {
      const event = status.events[i];
      displayEvent(event);
    }
    lastEventCount = status.events.length;

    isComplete = status.isComplete;

    if (!isComplete) {
      await sleep(300);
    }
  }

  // Final status
  const finalStatus = await getBookingStatus(correlationId);
  displayFinalResult(finalStatus);
}

function displayEvent(event: SagaEvent): void {
  const icon = EVENT_ICONS[event.eventType] || "📌";
  const colorFn = EVENT_COLORS[event.eventType] || chalk.white;
  const time = new Date(event.timestamp).toLocaleTimeString();

  console.log(
    chalk.gray(`[${time}]`),
    icon,
    colorFn(`[${event.eventType}]`),
    chalk.gray(`- ${event.service}`),
  );

  // Show relevant data
  if (event.eventType === "PricingCalculated") {
    const data = event.data as {
      basePrice?: number;
      discountEligible?: boolean;
      discountAmount?: number;
      finalPrice?: number;
      reason?: string;
    };
    if (data.discountEligible) {
      console.log(
        chalk.gray("    └─"),
        chalk.green(`Discount eligible: ${data.reason}`),
      );
      console.log(
        chalk.gray("    └─"),
        chalk.green(
          `₹${data.basePrice} - ₹${data.discountAmount} = ₹${data.finalPrice}`,
        ),
      );
    } else {
      console.log(chalk.gray("    └─"), `Base price: ₹${data.basePrice}`);
    }
  }

  if (event.eventType === "DiscountQuotaRejected") {
    const data = event.data as { reason?: string };
    console.log(chalk.gray("    └─"), chalk.red(data.reason));
  }

  if (event.eventType === "PaymentFailed") {
    const data = event.data as { reason?: string };
    console.log(chalk.gray("    └─"), chalk.red(data.reason));
  }

  if (event.eventType === "CompensationTriggered") {
    const data = event.data as { originalEvent?: string; reason?: string };
    console.log(
      chalk.gray("    └─"),
      chalk.yellow(`Compensating for: ${data.originalEvent}`),
    );
  }

  if (event.eventType === "DiscountQuotaReleased") {
    const data = event.data as { reason?: string };
    console.log(
      chalk.gray("    └─"),
      chalk.magenta(`Quota released: ${data.reason}`),
    );
  }
}

function displayFinalResult(status: BookingStatus): void {
  console.log(chalk.gray("\n─────────────────────────────────────────"));

  if (status.booking.status === "confirmed") {
    console.log(chalk.bgGreen.black.bold("\n  ✅ BOOKING CONFIRMED  \n"));
    console.log(
      chalk.green("Reference ID:"),
      chalk.bold(status.booking.referenceId),
    );
    console.log(
      chalk.green("Final Amount:"),
      chalk.bold(`₹${status.booking.finalPrice?.toLocaleString("en-IN")}`),
    );
    if (status.booking.discountApplied) {
      console.log(chalk.green("Discount:"), chalk.bold("12% Applied ✓"));
    }
  } else {
    console.log(chalk.bgRed.white.bold("\n  ❌ BOOKING FAILED  \n"));
    console.log(chalk.red("Reason:"), status.booking.errorMessage);

    // Check if compensation was executed
    const hasCompensation = status.events.some(
      (e) =>
        e.eventType === "CompensationTriggered" ||
        e.eventType === "DiscountQuotaReleased" ||
        e.eventType === "PaymentReversed",
    );

    if (hasCompensation) {
      console.log(chalk.yellow("Compensation:"), "Executed successfully");
    }
  }

  console.log(chalk.gray("\nCorrelation ID:"), chalk.dim(status.correlationId));
  console.log(chalk.gray("─────────────────────────────────────────\n"));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runInteractiveMode(): Promise<void> {
  console.log(chalk.bold.cyan("\n🏥 Medical Clinic Booking System - CLI\n"));

  // Step 1: Patient information
  const patientInfo = await inquirer.prompt([
    {
      type: "input",
      name: "customerName",
      message: "Enter your full name:",
      validate: (input: string) => input.length > 0 || "Name is required",
    },
    {
      type: "list",
      name: "gender",
      message: "Select your gender:",
      choices: [
        { name: "Male", value: "male" },
        { name: "Female", value: "female" },
      ],
    },
    {
      type: "input",
      name: "dateOfBirth",
      message: "Enter your date of birth (YYYY-MM-DD):",
      validate: (input: string) => {
        const date = new Date(input);
        return !isNaN(date.getTime()) || "Please enter a valid date";
      },
    },
  ]);

  // Step 2: Fetch and select services
  const spinner = ora("Loading available services...").start();
  const services = await fetchServices(patientInfo.gender);
  spinner.stop();

  const serviceSelection = await inquirer.prompt([
    {
      type: "checkbox",
      name: "serviceIds",
      message: "Select medical services:",
      choices: services.map((s) => ({
        name: `${s.name} - ₹${s.price.toLocaleString("en-IN")} (${s.description})`,
        value: s.id,
        short: s.name,
      })),
      validate: (input: string[]) =>
        input.length > 0 || "Please select at least one service",
    },
  ]);

  // Step 3: Show summary and confirm
  const selectedServices = services.filter((s) =>
    serviceSelection.serviceIds.includes(s.id),
  );
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  console.log(chalk.gray("\n─────────────────────────────────────────"));
  console.log(chalk.bold("📋 Booking Summary"));
  console.log(chalk.gray("─────────────────────────────────────────\n"));
  console.log("Name:", chalk.bold(patientInfo.customerName));
  console.log("Gender:", chalk.bold(patientInfo.gender));
  console.log("DOB:", chalk.bold(patientInfo.dateOfBirth));
  console.log("\nSelected Services:");
  selectedServices.forEach((s) => {
    console.log(
      chalk.gray("  •"),
      s.name,
      chalk.cyan(`₹${s.price.toLocaleString("en-IN")}`),
    );
  });
  console.log(
    "\nTotal:",
    chalk.bold.cyan(`₹${totalPrice.toLocaleString("en-IN")}`),
  );

  const confirm = await inquirer.prompt([
    {
      type: "confirm",
      name: "proceed",
      message: "Proceed with booking?",
      default: true,
    },
  ]);

  if (!confirm.proceed) {
    console.log(chalk.yellow("Booking cancelled."));
    return;
  }

  // Step 4: Submit booking
  const submitSpinner = ora("Submitting booking request...").start();

  try {
    const correlationId = await submitBooking({
      customerName: patientInfo.customerName,
      gender: patientInfo.gender,
      dateOfBirth: patientInfo.dateOfBirth,
      serviceIds: serviceSelection.serviceIds,
    });

    submitSpinner.succeed("Booking request submitted");
    console.log(chalk.gray("Correlation ID:"), correlationId);

    // Step 5: Poll for saga status
    await pollSagaStatus(correlationId);
  } catch (error) {
    submitSpinner.fail("Failed to submit booking");
    console.error(
      chalk.red(error instanceof Error ? error.message : "Unknown error"),
    );
  }
}

async function runTestMode(scenarioKey: string): Promise<void> {
  const scenario = TEST_SCENARIOS[scenarioKey];

  if (!scenario) {
    console.error(chalk.red(`Unknown test scenario: ${scenarioKey}`));
    console.log("\nAvailable scenarios:");
    Object.entries(TEST_SCENARIOS).forEach(([key, s]) => {
      console.log(chalk.gray("  •"), chalk.bold(key), "-", s.name);
    });
    return;
  }

  console.log(
    chalk.bold.cyan("\n🧪 Running Test Scenario:", scenario.name, "\n"),
  );

  // Setup scenario if needed
  if (scenario.setupAction) {
    const setupSpinner = ora(`Setting up: ${scenario.setupAction}`).start();
    await setupTestScenario(scenario.setupAction);
    setupSpinner.succeed(`Setup complete: ${scenario.setupAction}`);
    await sleep(500);
  }

  // For payment failure test, we need to set payment mode
  if (scenarioKey === "payment-failure") {
    console.log(
      chalk.yellow(
        "\n⚠️  Note: Set PAYMENT_SIMULATION_MODE=fail in .env.local to test payment failure",
      ),
    );
    console.log(chalk.yellow("    Then restart the Next.js server.\n"));
  }

  console.log(chalk.gray("Test Data:"));
  console.log("  Name:", scenario.customerName);
  console.log("  Gender:", scenario.gender);
  console.log("  DOB:", scenario.dateOfBirth);
  console.log("  Services:", scenario.serviceIds.join(", "));

  const spinner = ora("Submitting test booking...").start();

  try {
    const correlationId = await submitBooking({
      customerName: scenario.customerName,
      gender: scenario.gender,
      dateOfBirth: scenario.dateOfBirth,
      serviceIds: scenario.serviceIds,
    });

    spinner.succeed("Test booking submitted");
    await pollSagaStatus(correlationId);
  } catch (error) {
    spinner.fail("Test failed");
    console.error(
      chalk.red(error instanceof Error ? error.message : "Unknown error"),
    );
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--test")) {
    const testIndex = args.indexOf("--test");
    const scenario = args[testIndex + 1] || "happy";
    await runTestMode(scenario);
  } else if (args.includes("--help") || args.includes("-h")) {
    console.log(chalk.bold("\n🏥 Medical Clinic Booking CLI\n"));
    console.log("Usage:");
    console.log(
      "  npx ts-node index.ts",
      chalk.gray("          # Interactive mode"),
    );
    console.log(
      "  npx ts-node index.ts --test <scenario>",
      chalk.gray("# Run test scenario"),
    );
    console.log("\nTest Scenarios:");
    Object.entries(TEST_SCENARIOS).forEach(([key, s]) => {
      console.log(chalk.gray("  •"), chalk.bold(key), "-", s.name);
    });
    console.log("\nEnvironment Variables:");
    console.log(
      "  API_BASE",
      chalk.gray("- Backend URL (default: http://localhost:3000)"),
    );
  } else {
    await runInteractiveMode();
  }
}

main().catch(console.error);
