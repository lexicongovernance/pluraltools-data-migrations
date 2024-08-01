import { eq } from 'drizzle-orm';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { z } from 'zod';
import * as schema from './schema';
import { dataSchema, fieldsSchema } from './validation';

export async function up(db: NodePgDatabase<typeof schema>) {
  console.log('starting v.2.6.0 data migration');
  // start transaction
  await db.transaction(async (tx) => {
    try {
      const oldFields = await tx.query.registrationFields.findMany({
        with: {
          registrationFieldOptions: true,
        },
      });
      const oldData = await tx.query.registrationData.findMany({
        with: {
          registrationField: true,
        },
      });

      // setup fields in new format with eventId
      const newFieldsArray: (z.infer<typeof fieldsSchema>[string] & { eventId?: string })[] =
        oldFields.map((field) => {
          return {
            id: field.id,
            name: field.name,
            eventId: field.eventId,
            description: field.description ?? '',
            type: field.type as z.infer<typeof fieldsSchema>[string]['type'],
            position: field.fieldDisplayRank ?? 0,
            options: field.registrationFieldOptions.map((option) => option.value),
            validation: {
              required: !!field.required,
            },
          };
        });

      // group fields by eventId
      const fieldsByEventId = newFieldsArray.reduce(
        (acc, field) => {
          if (field.eventId && !acc[field.eventId]) {
            acc[field.eventId] = [];
          }

          delete field['eventId'];

          acc[field.eventId!] = [
            ...(acc[field.eventId!] ?? []),
            {
              [field.id]: field,
            } as z.infer<typeof fieldsSchema>,
          ];
          return acc;
        },
        {} as Record<string, z.infer<typeof fieldsSchema>[]>,
      );

      // setup data in new format with registration id
      const newDataArray: (z.infer<typeof dataSchema>[string] & { registrationId?: string })[] =
        oldData.map((data) => {
          return {
            id: data.id,
            fieldId: data.registrationField.id,
            registrationId: data.registrationId,
            value: data.value,
            type: data.registrationField.type as z.infer<typeof dataSchema>[string]['type'],
          };
        });

      // group data by registrationId
      const dataByRegistrationId = newDataArray.reduce(
        (acc, data) => {
          if (!data.registrationId) {
            return acc;
          }

          if (!acc[data.registrationId]) {
            acc[data.registrationId] = [];
          }

          delete data['registrationId'];

          acc[data.registrationId!] = [
            ...(acc[data.registrationId!] ?? []),
            {
              [data.fieldId]: data,
            } as z.infer<typeof dataSchema>,
          ];
          return acc;
        },
        {} as Record<string, z.infer<typeof dataSchema>[]>,
      );

      // update fields
      for (const [eventId, fields] of Object.entries(fieldsByEventId)) {
        const parsedFields = fieldsSchema.parse(fields);

        await tx
          .update(schema.events)
          .set({
            fields: parsedFields,
          })
          .where(eq(schema.events.id, eventId));
      }

      for (const [registrationId, data] of Object.entries(dataByRegistrationId)) {
        const parsedData = dataSchema.parse(data);

        await tx
          .update(schema.registrations)
          .set({
            data: parsedData,
          })
          .where(eq(schema.registrations.id, registrationId));
      }

      await tx.delete(schema.registrationFields);
      await tx.delete(schema.registrationData);
      await tx.delete(schema.registrationFieldOptions);
      console.log('v.2.6.0 data migration complete');
    } catch (e) {
      console.error('error running v.2.6.0 data migration', e);
      await tx.rollback();
    }
  });
}
