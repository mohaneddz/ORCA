import { useQuery } from "@tanstack/react-query";
import { withQueryDefaults } from "@/lib/query/queryConfig";
import { getSourceMode } from "@/lib/query/sourceMode";
import { get_training_page_data } from "@/lib/data/trainingData";

export function useTrainingPageQuery() {
  const mode = getSourceMode();
  return useQuery(withQueryDefaults({
    queryKey: ["training-page", mode],
    queryFn: get_training_page_data,
  }));
}
