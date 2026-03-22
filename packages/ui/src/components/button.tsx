interface ButtonProps {
	label: string;
}

export const Button = ({ label }: ButtonProps) => {
	return (
		<button type="button" className="bg-red-500">
			{label}
		</button>
	);
};
