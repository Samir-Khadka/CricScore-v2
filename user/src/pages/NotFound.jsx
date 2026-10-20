import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="text-center">
        <SearchX className="mx-auto text-[#10b981]" size={44} />
        <p className="mt-4 text-4xl font-space font-black text-heading">
          404
        </p>
        <p className="mt-2 text-subheading">
          The page you are looking for does not exist.
        </p>
        <Link
          to="/"
          className="inline-block mt-6 px-6 py-3 rounded-xl text-sm font-semibold text-black bg-gradient-to-r from-[#10b981] to-[#a3e635]"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
