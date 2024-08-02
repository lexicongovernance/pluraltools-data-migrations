import { eq } from 'drizzle-orm';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import assert from 'node:assert';
import test, { after, before, describe } from 'node:test';
import { up } from './migrate';
import { createTestDatabase } from './db';
import { env } from './env';
import * as schema from './db/schema';
import { dataSchema, fieldsSchema } from './validation';

describe('v2.6.0 ', () => {
  let db: NodePgDatabase<typeof schema>;
  let deleteTestDb: () => Promise<void>;

  before(async () => {
    const envVariables = env.parse(process.env);
    const { dbClient: connClient, teardown } = await createTestDatabase({
      envVariables,
      schema,
    });
    db = drizzle(connClient, { schema });
    deleteTestDb = teardown;
  });

  after(async () => {
    await deleteTestDb();
  });

  test('can migrate data', async () => {
    // create event
    const eventRows = await db
      .insert(schema.events)
      .values({
        name: 'Test Event',
        description: 'Test Event Description',
      })
      .returning();

    const event = eventRows[0];

    assert(event);

    // create registration fields
    const firstNameFieldRows = await db
      .insert(schema.registrationFields)
      .values({
        eventId: event?.id ?? '',
        name: 'First Name',
        required: true,
        type: 'TEXT',
        fieldDisplayRank: 0,
        forUser: true,
        characterLimit: 20,
      })
      .returning();

    const firstNameField = firstNameFieldRows[0];

    assert(firstNameField);

    const lastNameFieldRows = await db
      .insert(schema.registrationFields)
      .values({
        eventId: event?.id ?? '',
        name: 'Last Name',
        required: true,
        type: 'TEXT',
        fieldDisplayRank: 1,
        forUser: true,
        characterLimit: 20,
      })
      .returning();

    const lastNameField = lastNameFieldRows[0];

    assert(lastNameField);

    const ageFieldRows = await db
      .insert(schema.registrationFields)
      .values({
        eventId: event?.id ?? '',
        name: 'Age',
        required: true,
        type: 'NUMBER',
        fieldDisplayRank: 2,
        forUser: true,
      })
      .returning();

    const ageField = ageFieldRows[0];

    assert(ageField);

    const selectFieldRows = await db
      .insert(schema.registrationFields)
      .values({
        eventId: event?.id ?? '',
        name: 'Select Field',
        required: true,
        type: 'SELECT',
        fieldDisplayRank: 3,
        forUser: true,
      })
      .returning();

    const selectField = selectFieldRows[0];

    assert(selectField);

    // create registration field options
    await db.insert(schema.registrationFieldOptions).values({
      registrationFieldId: selectField.id,
      value: 'Option 1',
    });

    await db.insert(schema.registrationFieldOptions).values({
      registrationFieldId: selectField.id,
      value: 'Option 2',
    });

    // create user
    const userRows = await db.insert(schema.users).values({}).returning();

    const user = userRows[0];

    assert(user);

    // create registration

    const registrationRows = await db
      .insert(schema.registrations)
      .values({
        userId: user.id,
        eventId: event.id,
      })
      .returning();

    const registration = registrationRows[0];

    assert(registration);

    // create registration data
    await db.insert(schema.registrationData).values({
      registrationId: registration.id,
      registrationFieldId: firstNameField.id,
      value: 'John',
    });

    await db.insert(schema.registrationData).values({
      registrationId: registration.id,
      registrationFieldId: lastNameField.id,
      value: 'Doe',
    });

    await db.insert(schema.registrationData).values({
      registrationId: registration.id,
      registrationFieldId: ageField.id,
      value: '30',
    });

    await db.insert(schema.registrationData).values({
      registrationId: registration.id,
      registrationFieldId: selectField.id,
      value: 'Option 1',
    });

    // run migration
    await up(db);

    // check data
    const updatedEvent = await db.query.events.findFirst({
      where: eq(schema.events.id, event.id),
      with: {
        registrationFields: true,
      },
    });

    const updatedRegistrations = await db.query.registrations.findMany({
      with: {
        registrationData: true,
      },
    });

    assert(updatedEvent);
    assert(updatedRegistrations);

    // check that the event has the correct fields

    assert(updatedEvent.fields);

    const fields = fieldsSchema.parse(updatedEvent.fields);

    assert(fields);
    assert(Object.values(fields).length === 4);

    assert(fields[firstNameField.id]);
    assert(fields[lastNameField.id]);
    assert(fields[ageField.id]);
    assert(fields[selectField.id]);

    // check that the registration data is correct
    assert(updatedRegistrations.length === 1);

    const updatedRegistration = updatedRegistrations[0];

    assert(updatedRegistration);

    const data = dataSchema.parse(updatedRegistration.data);

    assert(data);
    assert(Object.values(data).length === 4);

    assert(data[firstNameField.id]);
    assert(data[lastNameField.id]);
    assert(data[ageField.id]);
    assert(data[selectField.id]);

    assert(data[firstNameField.id]?.value === 'John');
    assert(data[lastNameField.id]?.value === 'Doe');
    assert(data[ageField.id]?.value === '30');
    assert(data[selectField.id]?.value === 'Option 1');
  });
});
