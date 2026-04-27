alter table "public"."mealplan" drop constraint "mealplan_meal_period_check";

alter type "public"."pet_type_enum" rename to "pet_type_enum__old_version_to_be_dropped";

create type "public"."pet_type_enum" as enum ('CAT', 'DOG', 'SMALL_PET', 'OTHER');

alter table "public"."room" alter column pettype type "public"."pet_type_enum" using pettype::text::"public"."pet_type_enum";

drop type "public"."pet_type_enum__old_version_to_be_dropped";

alter table "public"."mealplan" add constraint "mealplan_meal_period_check" CHECK (((meal_period)::text = ANY ((ARRAY['MORNING'::character varying, 'MIDDAY'::character varying, 'EVENING'::character varying])::text[]))) not valid;

alter table "public"."mealplan" validate constraint "mealplan_meal_period_check";


