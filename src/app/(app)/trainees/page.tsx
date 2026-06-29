import { getTrainees } from "@/actions/trainees";
import { TraineesClient } from "./trainees-client";

export default async function TraineesPage() {
  const trainees = await getTrainees();
  return <TraineesClient trainees={trainees} />;
}