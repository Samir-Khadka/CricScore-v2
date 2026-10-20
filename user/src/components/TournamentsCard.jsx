import { useNavigate } from "react-router-dom";

const Tournaments = (props) => {
  const navigate = useNavigate();

  // Pass already-fetched tournaments to the info page to avoid a refetch.
  const dataToPass = { tourInfo: props.tour };

  const handleNavigate = () => {
    navigate(`/tournament/${encodeURIComponent(props.name)}`, {
      state: dataToPass,
    });
  };

  return (
    <div
      className="w-fit p-3 bg-gradient-to-r from-[#cc66ff] to-[#00dbde] text-black font-semibold rounded-2xl hover:scale-105 hover:drop-shadow-[0_0_12px_rgba(204,102,255,0.5)] transition-all duration-300 cursor-pointer"
      onClick={handleNavigate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNavigate();
        }
      }}
    >
      <p>{props.name}</p>
    </div>
  );
};

export default Tournaments;
